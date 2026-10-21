---
name: brainstorming
description: Clarify intent before building a new or underspecified Spendist feature, module, user-visible behavior change, or larger plan. Use when the request leaves non-trivial product decisions open (who it is for, scope, data it owns, visibility, rollout) or when the user asks to brainstorm, think through, or design something. Skip it for precise, self-contained requests such as a named bug fix, a moved field, a copy change, or a command to run.
---

# Brainstorming

Adapted from [obra/superpowers `skills/brainstorming`](https://github.com/obra/superpowers/blob/b739a8af570e10a95898f2bdf6cec97467fa6c12/skills/brainstorming/SKILL.md) (MIT, see `LICENSE`). Spendist changes: narrower trigger, no visual-companion server, design notes stay out of the public repository, and the hand-off uses the repository's exec plans.

You are good at building. You build what you believe the user wants, and that belief is usually thinner than it feels. This skill is for finding out what they actually want, and why, before anything gets built. When you understand the why, you make the hundred unmentioned decisions the way they would have made them.

## First: what do you actually know?

Before replying, check what you know about what they want and why.

- **Everything that matters is in the request** ("move this field to the advanced section"). Do it through the normal workflow and say what you did. This skill does not apply.
- **Something non-trivial is missing** (for example: is a flag global or per administrator, who sees a module, what happens to existing data). Start the conversation.

Read the relevant code, `doc/features/`, and `llm-full.txt` first. Never ask what the repository already answers.

## Your first message

1. One line saying they can skip the questions and have you start. If they do, this skill is done: state any significant choice you are making in one plain line, then proceed through the normal workflow.
2. One open question that gets them describing a real moment or a concrete picture.

That is the whole message. Write in the user's language.

## The conversation

Each message ends with one question: a single sentence without a list of example answers. Use plain language and match the user's vocabulary.

- **Get them describing.** Open questions first. Offer a short menu only when they are stuck. When they say "just guess" or "what do you think?", propose something concrete.
- **How it gets made.** Spendist already fixes most technical choices (Angular, Supabase, Tailwind/DaisyUI, Transloco, Nx). Build on them. Ask only about choices with product consequences, and state your defaults out loud as your call.
- **Ground to cover**, never read out as a script: what it is and who it serves; why now and what success looks like; goals, non-goals, and anti-goals; current state and prior attempts; details they care about.
- **Spendist boundaries to check silently:** free and open source, data portability, no feature gate on a user's own financial data, RLS ownership, production data safety, Polish and English copy, public versus private repository content.
- **Questions that work** anchor in specifics: "Walk me through the last time...", "If it could only do one of these well, which?", "What would make you wince if I got it wrong?" A guess they can correct often beats a question.
- **Think wide privately.** Generate several approaches, drop the weak ones, and show a comparison only when it helps them decide.
- **Spike when cheaper than talking.** Offer a throwaway prototype when it would teach more than questions. A spike stays labeled throwaway; keeping it is a new request.

## Play it back

As soon as you understand one part well enough, describe it back in about 200-300 words, then continue with questions about the next part. Mark your guesses as guesses; only what they said goes in as theirs. End each chunk by asking what is wrong or missing.

## Size the work

Once you understand what they want, pick a size and say it in plain words. They can override it.

| Size | The full description | Then |
| --- | --- | --- |
| A quick, clear task | the request itself | do it |
| A small change | in chat | build it through the normal workflow |
| A project | a written design | write `.agent/YYYY-MM-DD-<topic>-execplan.md` per `AGENTS.md`, then build |

If it grows mid-task, stop, say so, and step up a size. If it is really several independent projects, agree on an order and brainstorm them one at a time.

## The written design

For a project, write a plain document a capable engineer could plan from without asking the user again: intent and why, goals/non-goals/anti-goals, constraints, the decisions the user made (as they made them), and what is left to the builder.

**Where it goes:** `.agent/YYYY-MM-DD-<topic>-design.md` in `app/` (git-ignored). Strategy, funding, or promotion designs go in the private `management/` repository. Never put private product or business deliberation in the public repository; once the feature ships, the public record is its `doc/features/` page.

**Builder check:** dispatch a fresh subagent with `builder-check-prompt.md` from this directory. Sort its questions into: already answered (add the answer to the document), minor (decide yourself and mark it as your call), and theirs (only the user can answer and the answer changes what gets built). Bring the "theirs" pile in one message, most important first, then hand over the document with a short list of your calls. Without a subagent tool, read the document as that builder yourself.

<HARD-GATE>
While this skill applies, nothing gets built until the user approves the full description: in chat for a small change, the document for a project. Building includes product code, migrations, scaffolding, installing dependencies, and commits. Reading and exploring are fine.

Exceptions: the user opted out of the questions, or they approved a throwaway spike.
</HARD-GATE>

## Red flags

| Thought | Reality |
| --- | --- |
| "I'll offer options to save them effort" | Options steer. Ask them to describe it first. |
| "I'll fill in sensible defaults" | Good. Say them out loud; an unheard default cannot be rejected. |
| "I should explain the process first" | Ask your question. The process shows itself. |
| "They said 'sounds good' to the idea" | Approval covers what you showed them, not what you have not written. |
| "The request is clear, but I'll brainstorm anyway" | Do not. This skill is for open decisions, not ceremony. |
