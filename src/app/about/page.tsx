import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/landing/SiteNav";
import { Footer } from "@/components/landing/Footer";
import { appUrl } from "@/lib/host";
import "@/styles/site.css";

export const metadata: Metadata = {
  title: "About — 200 Words a Day",
  description:
    "The story behind 200 Words a Day and the team putting the fun back into learning vocab that sticks.",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
};

/** Quick-fact chips shown under the intro headline. */
const STATS = ["Since 2004", "1,000+ learners", "4 languages"];

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  photo?: string;
};

/** Editorial team roster (marketing copy, not the blog-authors table). Kevin has a
 *  photo; the others fall back to an initials monogram until portraits exist. */
const TEAM: TeamMember[] = [
  {
    name: "Kevin Crocombe",
    role: "Founder & creator",
    bio: "Learned French by total immersion at boarding school in New Caledonia, then spent years cracking how the Memory Masters learn languages — and built 200 Words a Day to make it fun.",
    photo: "/marketing/g/founder-kevin.png",
  },
  {
    name: "Ryan Crocombe",
    role: "Founder",
    bio: "Founder of 200 Words a Day. Obsessed with making vocabulary stick through humour, spaced repetition, and tiny daily wins.",
  },
  {
    name: "Camille Laurent",
    role: "Language coach",
    bio: "Language coach and polyglot. Camille has taught French and Spanish for over a decade and believes anyone can learn a language with the right daily habit.",
  },
];

/** Photo if we have one, else the member's initials in a tan circle. */
function TeamAvatar({ member }: { member: TeamMember }) {
  if (member.photo) {
    return (
      <Image
        src={member.photo}
        alt=""
        width={72}
        height={72}
        className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      aria-hidden
      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--tan)] heading-xs text-[var(--ink)]"
    >
      {initials}
    </span>
  );
}

export default function AboutPage() {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* 1 · INTRO — mission statement + quick facts + primary CTA. */}
        <section aria-label="About us" className="container py-14 sm:py-20">
          <div className="flex max-w-[720px] flex-col items-start gap-6">
            <p className="eyebrow">About us</p>
            <h1 className="heading-xl text-[var(--ink)]">
              We put the fun back into learning vocab that{" "}
              <span className="mark">sticks</span>
            </h1>
            <p className="body text-[var(--ink-soft)]">
              200 Words a Day helps you learn foreign vocabulary in a way you can actually
              enjoy. Every word comes with a wacky memory hook your brain can&rsquo;t forget,
              so you learn lots of words fast &mdash; without the boredom that makes most
              people quit.
            </p>
            <ul className="flex flex-wrap gap-2.5">
              {STATS.map((stat) => (
                <li key={stat} className="pill text-[14px]">
                  {stat}
                </li>
              ))}
            </ul>
            <Link href={appUrl("/signup")} className="btn big">
              Start learning &ndash; it&rsquo;s free
            </Link>
          </div>
        </section>

        {/* 2 · OUR STORY — Kevin's letter, faithfully reproduced. */}
        <section aria-label="Our story" className="bg-[#fffdf7] py-16 sm:py-24">
          <div className="container">
            <div className="flex max-w-[720px] flex-col gap-6">
              <p className="eyebrow">Our story</p>
              <h2 className="heading-l text-[var(--ink)]">Dear language learner</h2>

              <div className="flex flex-col gap-5 body text-[var(--ink-soft)]">
                <p>I know what it is like trying to learn a language.</p>

                <p>When I was 11, I went to a boarding school in New Caledonia.</p>

                <p>
                  Nobody at the school spoke English, so in that{" "}
                  <strong className="text-[var(--ink)]">total immersion situation</strong> I
                  was soon chattering away in French, as a kid does&hellip; and I was writing
                  my diary in French.
                </p>

                <p>
                  We all know that children learn so much faster than adults, and disregard
                  all the rules and mental barriers that adulthood brings. In no time the
                  child is thinking, and dreaming in the new language, and doing mental maths
                  in it.
                </p>

                <p>
                  After some months when my parents visited, I was so out of practice it took
                  a while to get speaking and thinking again in English mode!
                </p>

                <p>
                  In my thirties I decided to learn some German, my wife being fluent. I dived
                  in, and soon ground to a halt, using traditional methods of learning.
                </p>

                <p>
                  <strong className="text-[var(--ink)]">
                    <em>The learning was boring. It was dry. It was difficult</em>
                  </strong>
                  . <em>Put simply &ndash; the learning was </em>
                  <strong className="text-[var(--ink)]">
                    <em>not fun</em>
                  </strong>
                  .
                </p>

                <p>
                  Then I came across the Magic Memory Language Course by Paul Daniels. And this
                  was the first time I had come across how the Memory Masters learn languages.
                  It re-sparked my interest and enthusiasm for learning German.
                </p>

                <p>
                  I understand that Paul Daniels used the findings of Dr Gruneberg whose term
                  Linkword was coined for this method.
                </p>

                <p>
                  Several other memory experts taught the same techniques &ndash; Tony Buzan,
                  Mr Memory, Dominic O&rsquo;Brien, &hellip; and it was good &hellip;
                </p>

                <p>&hellip;BUT&hellip; there are a number of &lsquo;buts&rsquo;.</p>

                <p>
                  Let me first explain the technique, then we can discuss the
                  &lsquo;buts&rsquo; &ndash; the &lsquo;drawbacks&rsquo;.
                </p>

                <p>
                  The great <strong className="text-[var(--ink)]">Memory Masters</strong> of
                  the World teach us that the secret to remembering something is to see it in
                  your &ldquo;mind&rsquo;s eye&rdquo;, or visualize it, in a crazy scene. It is
                  a technique thousands of years old, used by the Ancient Greeks, Arabs, and
                  many ancient cultures. So to learn a foreign word we simply put together a{" "}
                  <strong className="text-[var(--ink)]">word association</strong>, like the
                  ones we build for every word, and it becomes a{" "}
                  <strong className="text-[var(--ink)]">Memory Trigger&copy;</strong>.
                </p>

                <ul className="flex list-disc flex-col gap-2 pl-6">
                  <li>
                    <strong className="text-[var(--ink)]">
                      The more vivid the visualization,
                    </strong>
                  </li>
                  <li>
                    <strong className="text-[var(--ink)]">the more action,</strong>
                  </li>
                  <li>
                    <strong className="text-[var(--ink)]">the more colour and spark,</strong>
                  </li>
                  <li>
                    <strong className="text-[var(--ink)]">the more crazy,</strong>
                  </li>
                </ul>

                <p>&hellip; the easier it is to recall.</p>

                <p>
                  So to learn Spanish, and to remember Spanish words and Spanish phrases, you
                  just need to come up with a{" "}
                  <strong className="text-[var(--ink)]">
                    mad mental movie with some &lsquo;looney&rsquo; link to the word
                  </strong>{" "}
                  you are trying to remember&hellip;.
                </p>

                <p>
                  Yes&hellip; and it is effective,{" "}
                  <strong className="text-[var(--ink)]">but</strong> only to a point.
                </p>

                <p>
                  The problem is that it is also time-consuming to do it properly&hellip;{" "}
                  <strong className="text-[var(--ink)]">
                    and there were several key problems which led to me developing from it the
                    200 Words a Day! concept
                  </strong>
                  , which I call a Second Generation Visualization Techniques for Language
                  Learning.
                </p>

                <p>
                  <strong className="text-[var(--ink)]">
                    This puts the fun back in to learning.
                  </strong>
                </p>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <Image
                  src="/marketing/g/founder-kevin.png"
                  alt=""
                  width={48}
                  height={48}
                  className="shrink-0 rounded-full"
                />
                <span className="eyebrow">Kevin Crocombe, founder</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 · TEAM — the people behind 200 Words a Day. */}
        <section aria-label="The team" className="container py-16 sm:py-24">
          <div className="flex flex-col items-start gap-4">
            <p className="eyebrow">The team</p>
            <h2 className="heading-xl text-[var(--ink)]">The people behind 200WAD</h2>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-[30px] md:grid-cols-3">
            {TEAM.map((member) => (
              <li key={member.name} className="card flex flex-col gap-4 p-6 sm:p-8">
                <TeamAvatar member={member} />
                <div className="flex flex-col gap-1">
                  <p className="heading-xs text-[var(--ink)]">{member.name}</p>
                  <p className="eyebrow">{member.role}</p>
                </div>
                <p className="body text-[var(--ink-soft)]">{member.bio}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
