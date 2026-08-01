import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/about")({ component: About });

const principles = [
  {
    number: "01",
    title: "Reflection Before Advice",
    body: "Healer-AI helps you ask better questions, not just get faster answers. The goal is clarity you can carry with you.",
    icon: "✦",
  },
  {
    number: "02",
    title: "Privacy As A Product Feature",
    body: "Your emotional data is yours. You stay in control of what is remembered, forgotten, or analyzed.",
    icon: "◌",
  },
  {
    number: "03",
    title: "Safety Before Intelligence",
    body: "No diagnosis. No replacing professionals. Just an honest companion that knows its limitations.",
    icon: "⌁",
  },
];

function About() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <main className="overflow-hidden">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 lg:px-8"
        aria-label="Main navigation"
      >
        <a
          href="/"
          className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-[#183b38]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#b5d4c4] text-sm text-[#183b38]">
            ✦
          </span>
          healer<span className="font-normal text-[#73968a]">.ai</span>
        </a>
        <a
          href="/"
          className="rounded-full border border-[#b9cec4] px-4 py-2 text-xs font-semibold tracking-wide text-[#31564e] transition hover:bg-[#e5f0ea]"
        >
          Start reflecting <span aria-hidden="true">→</span>
        </a>
      </nav>

      <section
        id="top"
        className="relative mx-auto max-w-6xl px-6 pb-24 pt-14 lg:px-8 lg:pb-36 lg:pt-24"
      >
        <div
          className="absolute -right-40 -top-28 h-[34rem] w-[34rem] rounded-full bg-[#d7e9dc]/60 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-14 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
          <div>
            <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5d8477]">
              <span className="h-px w-8 bg-[#8eb5a4]" /> A different kind of
              intelligence
            </p>
            <h1 className="max-w-3xl text-5xl font-medium leading-[1.06] tracking-[-0.055em] text-[#183b38] sm:text-6xl lg:text-[5.35rem]">
              Understand yourself.
              <br />
              <em className="font-serif font-normal text-[#598879]">Gently.</em>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#58716b]">
              Healer-AI is an emotionally intelligent companion for the moments
              that are hard to put into words.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <a
                href="/"
                className="rounded-full bg-[#255b51] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(37,91,81,.18)] transition hover:-translate-y-0.5 hover:bg-[#1e4d44]"
              >
                Start a conversation <span className="ml-2">→</span>
              </a>
              <a
                href="#approach"
                className="text-sm font-semibold text-[#52766c] transition hover:text-[#183b38]"
              >
                How it works <span className="ml-1">↓</span>
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:mr-0">
            <div className="relative aspect-[.9] overflow-hidden rounded-[10rem_10rem_2rem_2rem] bg-[#dbe9dc] shadow-[0_24px_70px_rgba(51,94,76,.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#f5e9d3_0%,transparent_30%),linear-gradient(145deg,transparent_40%,#a8cbb8_100%)] opacity-80" />
              <div className="absolute left-1/2 top-[27%] h-32 w-32 -translate-x-1/2 rounded-full bg-[#f1dfbf]/80 blur-[1px]" />
              <div className="absolute bottom-[-7%] left-1/2 h-[56%] w-[68%] -translate-x-1/2 rounded-t-[50%] bg-[#6e9e8c]/70" />
              <div className="absolute bottom-7 left-7 rounded-2xl border border-white/60 bg-white/65 px-4 py-3 shadow-lg backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[.17em] text-[#628278]">
                  A moment to notice
                </p>
                <p className="mt-1 text-sm font-medium text-[#31564e]">
                  What are you carrying today?
                </p>
              </div>
              <div className="absolute right-7 top-12 grid h-14 w-14 place-items-center rounded-full bg-[#f6e7c9]/80 text-xl text-[#5d8477]">
                ✧
              </div>
            </div>
            <p className="mt-5 text-center text-xs tracking-wide text-[#78938a]">
              A quieter space to meet yourself.
            </p>
          </div>
        </div>
      </section>

      <section
        id="approach"
        className="border-y border-[#dbe7df] bg-[#f6f8f3] px-6 py-20 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1fr] lg:gap-24">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#79a092]">
              The space between
            </p>
            <div>
              <h2 className="max-w-2xl text-3xl font-medium leading-tight tracking-[-.04em] text-[#234a42] sm:text-4xl lg:text-[3.1rem]">
                We have built tools for getting more done.
                <br />
                <span className="text-[#73968a]">
                  What about being more{" "}
                  <em className="font-serif font-normal text-[#598879]">
                    human?
                  </em>
                </span>
              </h2>
              <p className="mt-7 max-w-xl text-base leading-8 text-[#607a72]">
                For decades, technology has optimized our calendars, inboxes,
                and output. But the inner world remains underserved. Grief,
                anxiety, burnout, heartbreak, isolation — none of them fit
                neatly into a productivity tool.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#79a092]">
              Our north star
            </p>
            <h2 className="text-3xl font-medium tracking-[-.04em] text-[#234a42] sm:text-4xl">
              Designed with care.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#779088]">
            Intelligence is only useful when it helps you come back to yourself.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((item) => (
            <article
              key={item.number}
              className="rounded-3xl border border-[#dbe7df] bg-[#fbfcf8] p-7 transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(48,91,73,.08)]"
            >
              <div className="mb-12 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e0eee5] text-lg text-[#4c806f]">
                  {item.icon}
                </span>
                <span className="text-xs tracking-[.15em] text-[#a1b8ae]">
                  {item.number}
                </span>
              </div>
              <h3 className="max-w-[13rem] text-xl font-medium leading-snug tracking-[-.025em] text-[#285047]">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#718a82]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="waitlist"
        className="mx-6 mb-12 overflow-hidden rounded-[2rem] bg-[#244f46] px-6 py-16 text-center sm:px-10 lg:mx-auto lg:max-w-6xl lg:py-24"
      >
        <div className="relative mx-auto max-w-2xl">
          <div className="absolute -left-28 -top-24 h-56 w-56 rounded-full bg-[#5e907c]/20 blur-3xl" />
          <p className="relative mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#a9cbbb]">
            Come as you are
          </p>
          <h2 className="relative text-4xl font-medium tracking-[-.05em] text-[#f2f5e9] sm:text-5xl">
            A little more room
            <br />
            <em className="font-serif font-normal text-[#b7d4bd]">
              to be human.
            </em>
          </h2>
          <p className="relative mx-auto mt-6 max-w-md text-sm leading-7 text-[#c0d4c8]">
            We&rsquo;re building Healer-AI thoughtfully. Join the early access
            list and be part of what comes next.
          </p>
          {submitted ? (
            <div className="relative mx-auto mt-9 rounded-full bg-[#d6ead8] px-5 py-4 text-sm font-semibold text-[#285047]">
              You&rsquo;re on the list. We&rsquo;ll be in touch soon ✦
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="relative mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="email" className="sr-only">
                Your email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3.5 text-sm text-white outline-none placeholder:text-[#a6c3b7] focus:border-[#c5e1c9] focus:ring-2 focus:ring-[#c5e1c9]/30"
              />
              <button
                type="submit"
                className="rounded-full bg-[#dcebd8] px-6 py-3.5 text-sm font-bold text-[#285047] transition hover:bg-white"
              >
                Get early access <span className="ml-1">→</span>
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 pb-9 text-xs text-[#8aa198] sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <a href="/" className="font-semibold tracking-wide text-[#52766c]">
          healer.ai
        </a>
        <span>Built on LotusOS · {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
