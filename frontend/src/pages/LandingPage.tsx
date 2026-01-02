// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: LandingPage.tsx
// Description: To display the landing page with application introduction and navigation options
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router Link component for navigation
import { Link } from "react-router-dom";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * LandingPage Component
 *
 * The main landing page of the application that introduces ParenZing to visitors.
 * Features include:
 * - Hero section with call-to-action
 * - Features showcase
 * - Testimonials section
 * - Contact information
 * - Smooth scrolling navigation
 *
 * @returns JSX element representing the landing page
 */
const LandingPage: React.FC = () => {
  // State to track if page is scrolled (for navigation bar styling)
  const [isScrolled, setIsScrolled] = useState(false);

  /**
   * Effect hook to handle scroll events
   * Updates isScrolled state when user scrolls down the page
   * Used to add border and shadow to navigation bar when scrolled
   */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20); // Set scrolled state if scroll position > 20px
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll); // Cleanup on unmount
  }, []);

  /**
   * Smoothly scrolls to a section on the page
   * Used for navigation menu items to jump to specific sections
   *
   * @param sectionId - The ID of the section element to scroll to
   */
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" }); // Smooth scroll animation
    }
  };

  return (
    <div
      className="min-h-screen font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? "#FAEFE2" : "#FAEFE2",
          borderBottom: isScrolled
            ? "1px solid #AA855B"
            : "1px solid transparent",
          boxShadow: isScrolled ? "0 2px 10px rgba(170, 133, 91, 0.1)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <img
                src="/logos/parenzing-side-logo-400x100-black.png"
                alt="ParenZing Logo"
                className="h-8 sm:h-9 md:h-10"
              />
            </div>
            <div className="hidden md:block">
              <div className="ml-6 lg:ml-10 flex items-baseline space-x-4 lg:space-x-8">
                <button
                  onClick={() => scrollToSection("features")}
                  className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-colors cursor-pointer hover:opacity-70"
                  style={{
                    color: "#32332D",
                    background: "none",
                    border: "none",
                  }}
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("testimonials")}
                  className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-colors cursor-pointer hover:opacity-70"
                  style={{
                    color: "#32332D",
                    background: "none",
                    border: "none",
                  }}
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("footer")}
                  className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-colors cursor-pointer hover:opacity-70"
                  style={{
                    color: "#32332D",
                    background: "none",
                    border: "none",
                  }}
                >
                  Contact
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <Link
                to="/login"
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer hover:opacity-70"
                style={{ color: "#32332D", background: "none", border: "none" }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 text-center transform hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#F2742C", color: "#F5F5F5" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E55A1F";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(242, 116, 44, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F2742C";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(242, 116, 44, 0.3)";
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-18 lg:pt-2 pb-12 sm:pb-16 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
                  style={{ color: "#32332D" }}
                >
                  Empowering Every Parent with{" "}
                  <span style={{ color: "#F2742C" }}>
                    Smart, Personalized Support
                  </span>
                </h1>
                <p
                  className="text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl"
                  style={{ color: "#32332D" }}
                >
                  Your AI-driven parenting companion that guides, supports, and
                  grows with you — every step of your child's journey.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/signup"
                  className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#F5F5F5",
                    boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(242, 116, 44, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(242, 116, 44, 0.3)";
                  }}
                >
                  Get Started for Free
                </Link>
                <Link
                  to="/professional-signup"
                  className="border-2 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block text-center"
                  style={{
                    borderColor: "#32332D",
                    color: "#32332D",
                    boxShadow: "0 2px 10px rgba(50, 51, 45, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#32332D";
                    e.currentTarget.style.color = "#F5F5F5";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(50, 51, 45, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#32332D";
                    e.currentTarget.style.boxShadow =
                      "0 2px 10px rgba(50, 51, 45, 0.1)";
                  }}
                >
                  Join as Professional
                </Link>
              </div>
            </div>

            <div className="relative mt-6 lg:mt-0">
              <div className="relative z-10">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    <div
                      className="rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        boxShadow: "0 2px 10px rgba(170, 133, 91, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(170, 133, 91, 0.2)";
                        e.currentTarget.style.borderColor = "#F2742C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 2px 10px rgba(170, 133, 91, 0.1)";
                        e.currentTarget.style.borderColor = "#AA855B";
                      }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 transition-transform duration-300 hover:scale-110"
                        style={{ backgroundColor: "#326586" }}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </div>
                      <h3
                        className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2"
                        style={{ color: "#32332D" }}
                      >
                        AI Insights
                      </h3>
                      <p
                        className="text-xs sm:text-sm"
                        style={{ color: "#32332D" }}
                      >
                        Personalized recommendations for your child's
                        development
                      </p>
                    </div>

                    <div
                      className="rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        boxShadow: "0 2px 10px rgba(170, 133, 91, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(170, 133, 91, 0.2)";
                        e.currentTarget.style.borderColor = "#F2742C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 2px 10px rgba(170, 133, 91, 0.1)";
                        e.currentTarget.style.borderColor = "#AA855B";
                      }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 transition-transform duration-300 hover:scale-110"
                        style={{ backgroundColor: "#0F5648" }}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <h3
                        className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2"
                        style={{ color: "#32332D" }}
                      >
                        Smart Diary
                      </h3>
                      <p
                        className="text-xs sm:text-sm"
                        style={{ color: "#32332D" }}
                      >
                        Track progress with AI-powered insights
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 md:space-y-4 mt-4 sm:mt-6 md:mt-8">
                    <div
                      className="rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        boxShadow: "0 2px 10px rgba(170, 133, 91, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(170, 133, 91, 0.2)";
                        e.currentTarget.style.borderColor = "#F2742C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 2px 10px rgba(170, 133, 91, 0.1)";
                        e.currentTarget.style.borderColor = "#AA855B";
                      }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 transition-transform duration-300 hover:scale-110"
                        style={{ backgroundColor: "#AA855B" }}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <h3
                        className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2"
                        style={{ color: "#32332D" }}
                      >
                        Community
                      </h3>
                      <p
                        className="text-xs sm:text-sm"
                        style={{ color: "#32332D" }}
                      >
                        Connect with other parents
                      </p>
                    </div>

                    <div
                      className="rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        boxShadow: "0 2px 10px rgba(170, 133, 91, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(170, 133, 91, 0.2)";
                        e.currentTarget.style.borderColor = "#F2742C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 2px 10px rgba(170, 133, 91, 0.1)";
                        e.currentTarget.style.borderColor = "#AA855B";
                      }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 transition-transform duration-300 hover:scale-110"
                        style={{ backgroundColor: "#722F37" }}
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3
                        className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2"
                        style={{ color: "#32332D" }}
                      >
                        Expert Access
                      </h3>
                      <p
                        className="text-xs sm:text-sm"
                        style={{ color: "#32332D" }}
                      >
                        Verified professionals at your fingertips
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section
        id="features"
        className="py-12 sm:py-16 md:py-20"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4"
              style={{ color: "#32332D" }}
            >
              Powerful Features for Modern Parents
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto"
              style={{ color: "#32332D" }}
            >
              Everything you need to navigate your parenting journey with
              confidence and support
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Feature 1 */}
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
                boxShadow: "0 4px 15px rgba(170, 133, 91, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(170, 133, 91, 0.2)";
                e.currentTarget.style.borderColor = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(170, 133, 91, 0.1)";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#F2742C" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4"
                style={{ color: "#32332D" }}
              >
                Agentic Multi-Agent AI
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{ color: "#32332D" }}
              >
                Collaborative, context-aware AI specialists that work together
                to give child-specific, personalized parenting support. Multiple
                specialized agents coordinate to produce consistent, actionable
                recommendations.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
                boxShadow: "0 4px 15px rgba(170, 133, 91, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(170, 133, 91, 0.2)";
                e.currentTarget.style.borderColor = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(170, 133, 91, 0.1)";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#326586" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4"
                style={{ color: "#32332D" }}
              >
                Smart Parenting Guidance
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{ color: "#32332D" }}
              >
                Evidence-based, practical advice tailored to your child's age
                and family context. AI synthesizes diary inputs, child
                development data, and curated resources for timely suggestions.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
                boxShadow: "0 4px 15px rgba(170, 133, 91, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(170, 133, 91, 0.2)";
                e.currentTarget.style.borderColor = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(170, 133, 91, 0.1)";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#0F5648" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4"
                style={{ color: "#32332D" }}
              >
                Parenting Diary & Reflections
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{ color: "#32332D" }}
              >
                Capture daily moments, moods, and developmental progress with
                optional photos/videos. Diary entries feed into the AI for
                personalized insights and trend detection.
              </p>
            </div>

            {/* Feature 4 */}
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
                boxShadow: "0 4px 15px rgba(170, 133, 91, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(170, 133, 91, 0.2)";
                e.currentTarget.style.borderColor = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(170, 133, 91, 0.1)";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#AA855B" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4"
                style={{ color: "#32332D" }}
              >
                Community Support
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{ color: "#32332D" }}
              >
                Join moderated parenting communities organized by age, topic, or
                developmental stage. Post stories, comment, reply, and find peer
                support with content managers ensuring safety.
              </p>
            </div>

            {/* Feature 5 */}
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 sm:col-span-2 lg:col-span-1 transform hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
                boxShadow: "0 4px 15px rgba(170, 133, 91, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(170, 133, 91, 0.2)";
                e.currentTarget.style.borderColor = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(170, 133, 91, 0.1)";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#722F37" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4"
                style={{ color: "#32332D" }}
              >
                Expert Access
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{ color: "#32332D" }}
              >
                Browse verified professionals, view contact details, and access
                local services aligned to your needs. Professionals submit
                credentials for coordinator review with approved listings in
                searchable directory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-12 sm:py-16 md:py-20"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4"
              style={{ color: "#32332D" }}
            >
              What Parents Are Saying
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl"
              style={{ color: "#32332D" }}
            >
              Real stories from real parents who've transformed their parenting
              journey
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: "#F2742C" }}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p
                className="text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-5 md:mb-6"
                style={{ color: "#32332D" }}
              >
                "This app helps me understand my child's behavior better — it
                feels like having a personal parenting coach!"
              </p>
              <div className="flex items-center">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <span className="text-white font-semibold text-base sm:text-lg">
                    A
                  </span>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p
                    className="font-semibold text-sm sm:text-base"
                    style={{ color: "#32332D" }}
                  >
                    Amelia
                  </p>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Parent of a 5-year-old
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: "#F2742C" }}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p
                className="text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-5 md:mb-6"
                style={{ color: "#32332D" }}
              >
                "The AI advice is simple, practical, and really fits our daily
                life."
              </p>
              <div className="flex items-center">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#326586" }}
                >
                  <span className="text-white font-semibold text-base sm:text-lg">
                    J
                  </span>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p
                    className="font-semibold text-sm sm:text-base"
                    style={{ color: "#32332D" }}
                  >
                    Jason
                  </p>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Father of 2 kids
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section
        className="py-12 sm:py-16 md:py-20"
        style={{ backgroundColor: "#0F5648" }}
      >
        <div className="max-w-4xl mx-auto text-center px-3 sm:px-4 md:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 md:mb-6"
            style={{ color: "#F5F5F5" }}
          >
            Start Your Parenting Journey with Confidence
          </h2>
          <p
            className="text-base sm:text-lg md:text-xl mb-6 sm:mb-7 md:mb-8 max-w-2xl mx-auto"
            style={{ color: "#F5F5F5" }}
          >
            Join thousands of parents building healthier, happier families with
            AI-powered insights.
          </p>
          <Link
            to="/signup"
            className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 inline-block transform hover:scale-105 hover:shadow-lg"
            style={{
              backgroundColor: "#F2742C",
              color: "#F5F5F5",
              boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E55A1F";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(242, 116, 44, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F2742C";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(242, 116, 44, 0.3)";
            }}
          >
            Try for Free Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="footer"
        className="py-8 sm:py-10 md:py-12"
        style={{ backgroundColor: "#32332D", color: "#F5F5F5" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
            <div className="sm:col-span-2">
              <div className="flex items-center mb-3 sm:mb-4">
                <img
                  src="/logos/parenzing-side-logo-400x100-white.png"
                  alt="ParenZing Logo"
                  className="h-10 sm:h-12"
                />
              </div>
              <p
                className="max-w-md leading-relaxed text-sm sm:text-base"
                style={{ color: "#AA855B" }}
              >
                Empowering every parent with smart, personalized support through
                AI-driven insights and community.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                Product
              </h3>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <span
                    className="transition-colors hover:text-white text-xs sm:text-sm cursor-default"
                    style={{ color: "#AA855B" }}
                  >
                    Features
                  </span>
                </li>
                <li>
                  <span
                    className="transition-colors hover:text-white text-xs sm:text-sm cursor-default"
                    style={{ color: "#AA855B" }}
                  >
                    Pricing
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                Company
              </h3>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <span
                    className="transition-colors hover:text-white text-xs sm:text-sm cursor-default"
                    style={{ color: "#AA855B" }}
                  >
                    About Us
                  </span>
                </li>
                <li>
                  <span
                    className="transition-colors hover:text-white text-xs sm:text-sm cursor-default"
                    style={{ color: "#AA855B" }}
                  >
                    Contact Us
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col md:flex-row justify-between items-center"
            style={{ borderTop: "1px solid #AA855B" }}
          >
            <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
              © 2025 ParenZing. All rights reserved.
            </p>
            <div className="flex space-x-4 sm:space-x-6 mt-3 sm:mt-4 md:mt-0">
              <span
                className="text-xs sm:text-sm transition-colors cursor-default"
                style={{ color: "#AA855B" }}
              >
                Privacy Policy
              </span>
              <span
                className="text-xs sm:text-sm transition-colors cursor-default"
                style={{ color: "#AA855B" }}
              >
                Terms of Service
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
