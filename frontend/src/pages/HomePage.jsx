import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Crown, FileUp, MessageCircle, ScanLine, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const features = [
  [FileUp, "UPLOAD FAST", "Publish study-ready notes for your community in a few focused steps.", "/upload"],
  [ScanLine, "SCAN & SEARCH", "Turn handwritten pages into searchable study material with OCR.", "/ocr"],
  [MessageCircle, "STUDY TOGETHER", "Ask questions, share wins, and stay accountable in live rooms.", "/chat"],
];

const personas = [
  ["EXAM CRUSHER", "Find the exact notes you need before the clock runs out.", "bg-[#b7c6c2]"],
  ["KNOWLEDGE SHARER", "Upload clear resources and build a better study community.", "bg-[#b7c6c2] neo-shadow-lg"],
  ["CURIOUS LEARNER", "Use OCR and peer chat to turn every doubt into progress.", "bg-[#171e19] text-white"],
];

export default function HomePage() {
  const { user } = useAuth();
  return (
    <main>
      <section className="neo-dot-pattern border-b-2 border-black px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="neo-border neo-shadow inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-bold tracking-wide"><ScanLine size={16}/> NEW: OCR STUDY TOOLS</span>
            <h1 className="font-display mt-7 text-6xl leading-[.86] md:text-8xl">STUDY <span className="text-transparent [-webkit-text-stroke:2px_#000]">SMARTER.</span><br />TOGETHER.</h1>
            <p className="mt-7 max-w-xl text-lg font-bold md:text-xl">Notflix turns scattered resources into one bold, searchable, student-powered study space.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/notes" className="neo-btn inline-flex items-center gap-2 bg-black px-6 py-4 text-white">EXPLORE NOTES <ArrowRight size={18}/></Link>
              {user ? (
                <Link to="/upload" className="neo-btn inline-flex items-center gap-2 bg-white px-6 py-4">UPLOAD NOTES <ArrowRight size={18}/></Link>
              ) : (
                <Link to="/signup" className="neo-btn inline-flex items-center gap-2 bg-white px-6 py-4">START FREE <ArrowRight size={18}/></Link>
              )}
            </div>
          </div>
          <div className="neo-shadow-lg neo-border overflow-hidden bg-white">
            <div className="flex items-center gap-2 border-b-2 border-black bg-[#171e19] px-4 py-3"><i className="h-3 w-3 rounded-full bg-red-400"/><i className="h-3 w-3 rounded-full bg-[#b7c6c2]"/><i className="h-3 w-3 rounded-full bg-green-400"/><span className="ml-auto text-xs font-bold tracking-widest text-white">NOTFLIX / DASHBOARD</span></div>
            <div className="grid gap-4 p-5 sm:grid-cols-3"><div className="h-24 border-2 border-black bg-[#b7c6c2]"/><div className="h-24 border-2 border-black bg-[#b7c6c2]"/><div className="h-24 border-2 border-black bg-[#171e19]"/><div className="sm:col-span-3 border-2 border-black p-5"><div className="mb-4 flex items-center gap-3"><span className="h-10 w-10 rounded-full border-2 border-black bg-[#b7c6c2]"/><span className="h-4 w-1/2 bg-black"/></div><div className="space-y-3"><div className="h-3 bg-[#b7c6c2]"/><div className="h-3 w-4/5 bg-[#b7c6c2]"/><div className="h-3 w-3/5 bg-[#b7c6c2]"/></div></div></div>
          </div>
        </div>
      </section>

      <div className="neo-marquee"><div>50,000+ STUDENTS &nbsp; ★ &nbsp; 200,000+ NOTES SHARED &nbsp; ★ &nbsp; OCR-POWERED LEARNING &nbsp; ★ &nbsp; 50,000+ STUDENTS &nbsp; ★ &nbsp; 200,000+ NOTES SHARED &nbsp; ★ &nbsp;</div></div>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2 md:px-12">
        <article className="border-2 border-dashed border-black bg-zinc-100 p-8 opacity-80 md:p-12"><X size={42}/><h2 className="font-display mt-7 text-4xl">THE OLD WAY</h2><p className="mt-4 text-lg font-bold">Lost PDFs. Disconnected chats. Hours wasted hunting for the one page that explains it clearly.</p></article>
        <article className="neo-card bg-[#b7c6c2] p-8 md:p-12"><Check size={42}/><h2 className="font-display mt-7 text-4xl">THE NOTFLIX WAY</h2><p className="mt-4 text-lg font-bold">One fearless platform for notes, scanned text, focused discussion, and premium study resources.</p></article>
      </section>

      <section className="border-y-2 border-black bg-[#b7c6c2] px-6 py-20 md:px-12"><div className="mx-auto max-w-7xl"><h2 className="font-display max-w-3xl text-5xl md:text-7xl">POWER TOOLS FOR POWER STUDENTS.</h2><div className="mt-12 grid gap-7 md:grid-cols-3">{features.map(([FeatureIcon, title, copy, path]) => <Link key={title} to={path} className="neo-card group p-7"><span className="grid h-16 w-16 place-items-center border-2 border-black bg-[#b7c6c2] transition group-hover:bg-white">{React.createElement(FeatureIcon, { size: 30 })}</span><h3 className="font-display mt-7 text-3xl">{title}</h3><p className="mt-3 font-bold">{copy}</p></Link>)}</div></div></section>

      <section className="bg-[#171e19] px-6 py-20 text-white md:px-12"><div className="mx-auto max-w-7xl"><h2 className="font-display text-5xl text-[#b7c6c2] md:text-7xl">HOW IT WORKS.</h2><div className="mt-14 grid gap-10 md:grid-cols-3">{[["01","UPLOAD","Bring your PDFs, DOCX, and TXT files."],["02","ORGANIZE","Use OCR and clear subjects to find ideas fast."],["03","SUCCEED","Learn with trusted notes and a live community."]].map(([n,t,c]) => <div key={n} className="border-t-4 border-[#b7c6c2] pt-5"><div className="font-display text-7xl text-[#b7c6c2]">{n}</div><h3 className="font-display mt-5 text-3xl text-[#b7c6c2]">{t}</h3><p className="mt-3 font-bold text-white">{c}</p></div>)}</div></div></section>

      <section className="px-6 py-20 md:px-12"><div className="mx-auto max-w-7xl"><h2 className="font-display text-center text-5xl md:text-7xl">BUILT FOR YOUR STUDY MODE.</h2><div className="mt-12 grid gap-7 md:grid-cols-3">{personas.map(([label, copy, color]) => <article key={label} className={`neo-card p-8 ${color}`}><span className="neo-border inline-block bg-white px-3 py-1 text-xs font-bold text-black">{label}</span><p className="font-display mt-12 text-3xl">{copy}</p></article>)}</div></div></section>

      <section className="neo-dot-pattern border-y-2 border-black px-6 py-24 text-center md:px-12"><h2 className="font-display mx-auto max-w-5xl text-6xl md:text-8xl">READY TO MAKE EVERY STUDY SESSION COUNT?</h2>{user ? (
        <Link to="/notes" className="neo-btn mt-10 inline-flex items-center gap-2 bg-black px-8 py-5 text-lg text-white">BROWSE NOTES <Crown size={20}/></Link>
      ) : (
        <Link to="/signup" className="neo-btn mt-10 inline-flex items-center gap-2 bg-black px-8 py-5 text-lg text-white">JOIN NOTFLIX <Crown size={20}/></Link>
      )}</section>
      <footer className="grid gap-10 bg-[#171e19] px-6 py-16 text-white md:grid-cols-4 md:px-12"><div><div className="font-display text-3xl text-[#b7c6c2]">NOTFLIX</div><p className="mt-4 font-bold text-[#b7c6c2]">The study platform that refuses to be boring.</p></div><div><b className="text-[#b7c6c2]">PLATFORM</b><div className="mt-4 grid gap-2 font-bold"><Link to="/notes">Notes</Link><Link to="/chat">Chat</Link><Link to="/ocr">OCR</Link></div></div><div><b className="text-[#b7c6c2]">ACCOUNT</b>{user ? (
        <div className="mt-4 grid gap-2 font-bold"><Link to="/upload">Upload</Link><Link to="/premium">Premium</Link></div>
      ) : (
        <div className="mt-4 grid gap-2 font-bold"><Link to="/login">Login</Link><Link to="/signup">Create account</Link><Link to="/premium">Premium</Link></div>
      )}</div><div><b className="text-[#b7c6c2]">SUPPORT</b><div className="mt-4 grid gap-2 font-bold"><Link to="/contact-us">Contact</Link><Link to="/privacy-policy">Privacy</Link><Link to="/terms-and-conditions">Terms</Link></div></div></footer>
    </main>
  );
}
