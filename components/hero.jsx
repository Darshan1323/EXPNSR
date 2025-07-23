"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { useEffect, useRef } from "react";

const HeroSection = () => {
  const imageRef = useRef();

  useEffect(() => {
    const imageElement = imageRef.current;
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="pb-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl md:text-8xl lg:text-[105px] pb-6 bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 font-extrabold tracking-tighter text-transparent bg-clip-text leading-tight">
          Manage Your Finances <br /> with Intelligence
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto px-2">
          An AI-powered financial management platform that helps you track,
          analyze, and optimize your spending with real-time insights.
        </p>

        <div className="flex flex-col sm:flex-row justify-center sm:space-x-4 space-y-4 sm:space-y-0 mb-8 px-4">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-8">
              Get Started
            </Button>
          </Link>
          <Link href="https://www.youtube.com/roadsidecoder" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
              Watch Demo
            </Button>
          </Link>
        </div>

        <div className="hero-image-wrapper">
          <div ref={imageRef} className="hero-image px-2">
            <Image
              src="/banner.png"
              width={1200}
              height={600}
              alt="Dashboard preview"
              priority
              className="rounded-lg shadow-2xl border mx-auto w-full max-w-4xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
