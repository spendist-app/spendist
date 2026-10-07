"""Database concurrency regression: never connects to a production database."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess

CONTAINER = "supabase_db_spendist-app"
DATABASE = "spendist_email_test"

def query(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "supabase_admin",
         "-d", DATABASE, "-v", "ON_ERROR_STOP=1", "-At"],
        input=sql, text=True, capture_output=True, check=True,
    )
    return result.stdout.strip()

assert query("select current_database()") == DATABASE
query("""
truncate spendist_email.attempts, spendist_email.jobs, spendist_email.alerts;
update spendist_email.control set enabled=true,read_error=false,last_success_at=now(),
  monitor_token=null,monitor_until=null,next_send_at=now()-interval '1 second',
  snapshot='{"sent_24h":0,"aws_limit":100,"max_rate":1,"sending_enabled":true,"production_access":true,"enforcement_status":"HEALTHY"}';
insert into spendist_email.jobs(owner_id,dedupe_key,recipient,kind,subject,body,expires_at)
select gen_random_uuid(),'concurrent-'||n,'test'||n||'@example.test','auth','Test','Test only',now()+interval '1 hour'
from generate_series(1,25) n;
insert into spendist_email.attempts(job_id)
select (select id from spendist_email.jobs limit 1) from generate_series(1,99);
""")
with ThreadPoolExecutor(max_workers=12) as pool:
    claims = list(pool.map(lambda _: query("select public.email_claim()"), range(24)))
assert len([claim for claim in claims if claim]) == 1, "More than one sender reserved the final slot"
assert query("select count(*) from spendist_email.attempts") == "100"

# Concurrent admission for one account cannot bypass the 5/hour cap.
query("truncate spendist_email.attempts, spendist_email.jobs, spendist_email.alerts;")
owner = "71000000-0000-0000-0000-000000000009"
def enqueue(index):
    return query(f"""select public.email_enqueue('{owner}','admission-{index}',
      jsonb_build_array(jsonb_build_object('recipient','target{index}@example.test','kind','auth',
      'subject','Test','body','Test only','expires_at',now()+interval '1 hour')));""")
with ThreadPoolExecutor(max_workers=12) as pool:
    admitted = list(pool.map(enqueue, range(24)))
assert len([job for job in admitted if job]) == 5, "Per-account rate limit was bypassed"
query("truncate spendist_email.attempts, spendist_email.jobs, spendist_email.alerts; update spendist_email.control set enabled=false,read_error=true,last_success_at=null,snapshot=null;")
print("Passed: parallel final-slot reservation and per-account admission")
