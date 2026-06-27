"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const cleanups: Array<() => void> = [];

    if (!coarse) root.classList.add("cursor-hidden");

    const $ = <T extends Element>(s: string) => root.querySelector<T>(s);
    const $$ = <T extends Element>(s: string) =>
      Array.from(root.querySelectorAll<T>(s));

    /* custom cursor with lerp trail */
    if (!coarse && !reduce) {
      const dot = $<HTMLElement>(".cursor");
      const blob = $<HTMLElement>(".cursor-blob");
      let mx = window.innerWidth / 2,
        my = window.innerHeight / 2;
      let dx = mx, dy = my, bx = mx, by = my;
      let raf = 0;
      const onMove = (e: MouseEvent) => {
        mx = e.clientX;
        my = e.clientY;
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      const loop = () => {
        dx += (mx - dx) * 0.9;
        dy += (my - dy) * 0.9;
        bx += (mx - bx) * 0.14;
        by += (my - by) * 0.14;
        if (dot) dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
        if (blob) blob.style.transform = `translate(${bx}px,${by}px) translate(-50%,-50%)`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      cleanups.push(() => {
        window.removeEventListener("mousemove", onMove);
        cancelAnimationFrame(raf);
      });

      $$<HTMLElement>("a, button, .mag, .feature").forEach((el) => {
        const on = () => blob?.classList.add("grow");
        const off = () => blob?.classList.remove("grow");
        el.addEventListener("mouseenter", on);
        el.addEventListener("mouseleave", off);
        cleanups.push(() => {
          el.removeEventListener("mouseenter", on);
          el.removeEventListener("mouseleave", off);
        });
      });
    }

    /* magnetic hover */
    if (!coarse && !reduce) {
      $$<HTMLElement>(".mag").forEach((el) => {
        const strength = el.classList.contains("btn") ? 0.4 : 0.28;
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2);
          const y = e.clientY - (r.top + r.height / 2);
          el.style.transform = `translate(${x * strength}px,${y * strength}px)`;
        };
        const leave = () => (el.style.transform = "");
        el.addEventListener("mousemove", move);
        el.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          el.removeEventListener("mousemove", move);
          el.removeEventListener("mouseleave", leave);
        });
      });
    }

    /* nav shrink */
    const nav = $<HTMLElement>(".lnav");
    const onScroll = () => nav?.classList.toggle("shrunk", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    /* staggered reveal */
    const groups: Record<string, number> = {};
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const sec =
              (en.target.closest("section, .hero, .lfooter") as HTMLElement) ||
              root;
            const id = sec.id || "x";
            groups[id] = groups[id] || 0;
            (en.target as HTMLElement).style.transitionDelay =
              Math.min(groups[id], 6) * 70 + "ms";
            groups[id]++;
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    $$(".reveal").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* scoring bars */
    const dl = $<HTMLElement>(".dimlist");
    if (dl) {
      const dio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              dl.querySelectorAll<HTMLElement>(".fill").forEach((f, i) => {
                setTimeout(() => {
                  f.style.width = (f.dataset.v || "0") + "%";
                }, i * 130);
              });
              dio.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      dio.observe(dl);
      cleanups.push(() => dio.disconnect());
    }

    /* parallax aurora + hero tilt */
    if (!coarse && !reduce) {
      const auroras = $$<HTMLElement>(".aurora span");
      const card = $<HTMLElement>(".interview-card");
      const onPMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        auroras.forEach((a, i) => {
          const depth = (i + 1) * 14;
          a.style.marginLeft = nx * depth + "px";
          a.style.marginTop = ny * depth + "px";
        });
      };
      window.addEventListener("mousemove", onPMove, { passive: true });
      cleanups.push(() => window.removeEventListener("mousemove", onPMove));

      if (card) {
        const holder = card.parentElement!;
        const cm = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
        };
        const cl = () => (card.style.transform = "");
        holder.addEventListener("mousemove", cm);
        holder.addEventListener("mouseleave", cl);
        cleanups.push(() => {
          holder.removeEventListener("mousemove", cm);
          holder.removeEventListener("mouseleave", cl);
        });
      }
    }

    /* feature card tilt */
    if (!coarse && !reduce) {
      $$<HTMLElement>(".feature").forEach((el) => {
        const cm = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(800px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-6px)`;
        };
        const cl = () => (el.style.transform = "");
        el.addEventListener("mousemove", cm);
        el.addEventListener("mouseleave", cl);
        cleanups.push(() => {
          el.removeEventListener("mousemove", cm);
          el.removeEventListener("mouseleave", cl);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="loop-landing" ref={rootRef}>
      <div className="aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
      <div className="cursor-blob" aria-hidden="true" />
      <div className="cursor" aria-hidden="true" />

      <nav className="lnav">
        <div className="nav-inner">
          <Link className="logo mag" href="/">
            <span className="ldot" /> Loop
          </Link>
          <div className="nav-links">
            <a className="hide-sm mag" href="#features">Features</a>
            <a className="hide-sm mag" href="#flow">How it works</a>
            <a className="hide-sm mag" href="#scoring">Scoring</a>
            <Link className="btn mag" href="/problems">
              Start practicing <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="content">
        <header className="hero">
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="eyebrow reveal">
                  <span className="lpulse" /> Voice-first mock interviews
                </span>
                <h1 className="display reveal">
                  Practice the part of the interview{" "}
                  <span className="grad">you can&apos;t rehearse alone.</span>
                </h1>
                <p className="lead reveal">
                  Loop runs a real technical interview: you talk through your approach
                  out loud, write the code, walk a dry-run — and an AI that{" "}
                  <em>listens</em> probes your reasoning, then scores how you actually
                  communicated.
                </p>
                <div className="hero-cta reveal">
                  <Link className="btn mag" href="/problems">
                    Start a mock interview <span className="arrow">→</span>
                  </Link>
                  <a className="btn ghost mag" href="#flow">See how it works</a>
                </div>
                <div className="hero-stats reveal">
                  <div className="s"><span className="n">9</span><span className="l">interview phases</span></div>
                  <div className="s"><span className="n">5</span><span className="l">scored dimensions</span></div>
                  <div className="s"><span className="n">&lt;2s</span><span className="l">speech to feedback</span></div>
                </div>
              </div>

              <div className="hero-visual reveal">
                <div className="glasscard interview-card">
                  <div className="ic-head">
                    <div className="ic-avatar">🧑‍💼</div>
                    <div><div className="t">AI Interviewer</div><div className="n">Approach phase</div></div>
                  </div>
                  <div className="ic-line">
                    &quot;A hash map gives you O(n) — but why not just sort and use two
                    pointers? Talk me through the trade-off.&quot;
                  </div>
                  <div className="ic-wave" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, i) => <i key={i} />)}
                  </div>
                  <div className="ic-phases">
                    <span>Intro</span><span className="on">Approach</span>
                    <span>Coding</span><span>Dry run</span><span>Complexity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section id="features">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="sec-label">Why Loop</span>
              <h2>Coding sites grade your code.{" "}
                <span className="muted-grad">We grade the interview.</span></h2>
              <p>Real interviews are a conversation. Loop is built around the moments
                LeetCode can&apos;t touch — explaining, defending, and recovering under questions.</p>
            </div>
            <div className="features">
              {[
                ["🎙️", "It listens, out loud", "Unmute, explain your approach, pause. Your speech is transcribed and the interviewer responds to what you actually said — not a multiple-choice prompt."],
                ["🕵️", "The silent code check", "When you finish coding, Loop quietly reviews it. If there's a bug, it won't tell you — it asks a dry-run question that leads you to find it yourself."],
                ["↺", "Adaptive follow-ups", "Say “hash map” and it asks why not sorting. Every probe is generated from your reasoning, so no two interviews push you the same way."],
                ["📊", "Communication, scored", "Filler words, complexity coverage, edge-case mentions, dry-run depth — quantified into a scorecard, not just a vibe."],
                ["📈", "Trends that compound", "Every session feeds your dashboard: score trajectory, topic mastery, and the weak spots that keep showing up."],
                ["⚡", "One session, one verdict", "No submit button per step. The whole interview — approach to wrap-up — earns a single, honest evaluation, the way a real one does."],
              ].map(([ico, h, p]) => (
                <div className="feature reveal" key={h}>
                  <div className="ico">{ico}</div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="flow">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="sec-label">The flow</span>
              <h2>A stateful interview,{" "}<span className="muted-grad">not a form.</span></h2>
              <p>Loop moves through the same phases a Google or Amazon loop would — and you
                can step back to the editor mid-interview, just like the real thing.</p>
            </div>
            <div className="rail">
              {[
                ["PHASE 01", "Approach", "Read the problem, then talk through how you'd solve it before writing a line."],
                ["PHASE 02", "Coding", "Write it in the editor while the interviewer stays quiet — no interruptions."],
                ["PHASE 03", "Dry run", "Trace your code against an input the AI picked — sometimes one that exposes a bug."],
                ["PHASE 04", "Complexity", "Defend your time and space. “Can you do it in O(1) space?” Then the report."],
              ].map(([num, h, p]) => (
                <div className="step reveal" key={num}>
                  <span className="bar" />
                  <div className="num">{num}</div>
                  <h4>{h}</h4>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="scoring">
          <div className="wrap">
            <div className="band reveal">
              <div className="band-grid">
                <div>
                  <span className="sec-label">Scoring &amp; the flywheel</span>
                  <h2>Numbers an LLM can&apos;t give you.</h2>
                  <p>Loop scores every dimension with transparent, explainable rules today —
                    and as interviews accumulate, that becomes a dataset. A model trained on
                    real sessions can tell you where you rank, not just how you did. Every
                    interview makes the next one sharper.</p>
                </div>
                <div className="dimlist">
                  {[
                    ["Approach", 70], ["Communication", 92], ["Complexity", 78],
                    ["Dry-run depth", 64], ["Correctness", 95],
                  ].map(([lab, v]) => (
                    <div className="dim" key={lab as string}>
                      <span className="lab">{lab}</span>
                      <span className="track"><span className="fill" data-v={v} /></span>
                      <span className="val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="start" className="final">
          <div className="glow-ring" aria-hidden="true" />
          <div className="wrap">
            <h2 className="reveal">Your next interview shouldn&apos;t be your first time talking.</h2>
            <p className="reveal">Pick a problem, hit start, and explain it out loud. Loop does the rest.</p>
            <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
              <Link className="btn mag" href="/problems" style={{ fontSize: "1.05rem", padding: ".95rem 1.8rem" }}>
                Start a mock interview <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </section>

        <footer className="lfooter">
          <div className="wrap foot-inner">
            <div className="logo"><span className="ldot" /> Loop</div>
            <div>Voice mock interviews · AI scoring · built for placements</div>
            <div style={{ display: "flex", gap: "1.3rem" }}>
              <a className="mag" href="#features">Features</a>
              <a className="mag" href="#flow">Flow</a>
              <a className="mag" href="#scoring">Scoring</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
