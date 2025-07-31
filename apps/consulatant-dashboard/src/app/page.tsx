"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Instagram, Linkedin, Youtube, Twitter } from "lucide-react";

const consultantTypes = [
  {
    title: "Experienced industry individuals",
    description:
      "Experienced Industry Individuals They are experts who have worked in their industry for many years. Their experience helps businesses make better and more confident decisions.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M23.99 10C20.4187 10 17.5114 12.9339 17.5114 16.5203C17.5114 18.7892 18.6765 20.7925 20.4358 21.9602C18.3109 22.6706 16.4723 23.9985 15.1238 25.7357C14.3782 25.1622 13.5451 24.701 12.647 24.3705C14.0089 23.3595 14.8989 21.7353 14.8989 19.91C14.8989 16.8682 12.4388 14.3782 9.41547 14.3782C6.39215 14.3782 3.93208 16.8682 3.93208 19.91C3.93208 21.7364 4.82277 23.3613 6.18579 24.3723C2.57721 25.7039 0 29.1903 0 33.2933V36.1754C0.000369347 36.3951 0.0882567 36.6056 0.244089 36.7604C0.39992 36.9155 0.610779 37.0019 0.830496 37.0011H13.4755C13.5061 37.0045 13.5368 37.0063 13.5674 37.0059H34.4133C34.4439 37.0063 34.4749 37.0045 34.5052 37.0011H47.1511C47.6057 36.9993 47.9739 36.6304 47.975 36.1754V33.2933C47.975 29.1903 45.4022 25.7039 41.7955 24.3719C43.1585 23.3613 44.0492 21.736 44.0492 19.9096C44.0492 16.8679 41.5892 14.3778 38.5658 14.3778C35.5426 14.3778 33.0824 16.8679 33.0824 19.9096C33.0824 21.735 33.9728 23.3594 35.3346 24.3701C34.4347 24.7014 33.6013 25.1641 32.8546 25.739C31.5067 24.0008 29.6707 22.6711 27.5459 21.9602C29.3047 20.7925 30.4703 18.7892 30.4703 16.5203C30.4703 12.9339 27.5614 10 23.9902 10H23.99Z"
          fill="#99A9F7"
        />
      </svg>
    ),
  },
  {
    title: "Independent Consultants",
    description:
      "Independent Consultants These are professionals who work on their own and give advice based on their expertise. They offer solutions that are practical and personalized.",
    icon: (
      <svg
        width="49"
        height="48"
        viewBox="0 0 49 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M27.4163 19.0109C27.1042 19.0109 26.8506 18.7576 26.8506 18.4452V17.4839C26.8506 17.1719 27.1038 16.9182 27.4163 16.9182C27.7283 16.9182 27.9819 17.1715 27.9819 17.4839V18.4452C27.9819 18.7576 27.7283 19.0109 27.4163 19.0109Z"
          fill="#99A9F7"
        />
        <path
          d="M25.0381 19.0109C24.7261 19.0109 24.4724 18.7576 24.4724 18.4452V17.4839C24.4724 17.1719 24.7257 16.9182 25.0381 16.9182C25.3501 16.9182 25.6038 17.1715 25.6038 17.4839V18.4452C25.6034 18.7576 25.3505 19.0109 25.0381 19.0109Z"
          fill="#99A9F7"
        />
        <path
          d="M6.50047 38.6471C6.50047 38.9592 6.75372 39.2128 7.06615 39.2128H41.5139C41.8259 39.2128 42.0796 38.9596 42.0796 38.6471C42.0796 38.3351 41.8263 38.0815 41.5139 38.0815H40.4682V21.8402C40.4682 21.5281 40.215 21.2745 39.9025 21.2745L30.6668 21.2749V9.56576C30.6668 9.36774 30.5635 9.18471 30.3946 9.08214C30.2262 8.97919 30.0156 8.97287 29.8404 9.06399L19.3401 14.531C19.1527 14.6284 19.0359 14.8217 19.0359 15.0327V25.2604H8.87388C8.56186 25.2604 8.3082 25.5137 8.3082 25.8261V38.0816H7.06489C6.75287 38.0812 6.5 38.3344 6.5 38.6468L6.50047 38.6471Z"
          fill="#99A9F7"
        />
      </svg>
    ),
  },
  {
    title: "Freelance Consultants",
    description:
      "Freelance Consultants They work on short-term or project-based assignments. Businesses hire them when they need expert help without long-term commitments.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M28.3117 23.6441C28.0709 23.6441 27.8473 23.5779 27.6487 23.4715V23.4743C27.6487 23.8531 27.5014 24.2089 27.2343 24.4754C26.9671 24.7425 26.6116 24.8898 26.2332 24.8898C25.9889 24.8898 25.7625 24.8219 25.5617 24.7126C25.5415 25.0592 25.4029 25.3831 25.1558 25.6305C24.8886 25.8977 24.5331 26.0449 24.1545 26.0449C23.4022 26.0449 22.7913 25.4536 22.7473 24.7124C22.5145 24.8382 22.2513 24.9041 21.9799 24.8867C21.2398 24.8382 20.6603 24.1988 20.6603 23.4307V17.064L19.9353 18.32C19.6592 18.8004 19.1423 19.0986 18.5858 19.0986C18.3147 19.0986 18.0468 19.0275 17.8095 18.8916C17.5141 18.7203 17.3028 18.4453 17.2149 18.1164C17.1265 17.7873 17.1722 17.4431 17.3431 17.1481L19.8597 12.7886C19.8769 12.7507 19.9259 12.6406 19.9676 12.5469C20.7896 10.2538 22.5607 8.99949 24.6966 8.99949C27.4703 8.99949 29.7268 11.4464 29.7268 14.4541L29.727 22.2284C29.727 22.6068 29.58 22.9623 29.3131 23.2298C29.0459 23.4969 28.6904 23.6442 28.3116 23.6442Z"
          fill="#99A9F7"
        />
        <path
          d="M39.6183 36.6581C38.924 37.8161 37.7821 38.6086 36.4027 38.8904C35.0355 39.1691 33.5977 38.9121 32.3532 38.1659L25.6862 34.1665C25.3618 33.9719 25.1323 33.6627 25.0404 33.2957C24.9493 32.9293 25.0063 32.5488 25.2006 32.2246C25.322 32.022 25.4921 31.8623 25.6893 31.7442C25.363 31.5485 25.1335 31.2393 25.0421 30.8727C24.9502 30.5062 25.0072 30.1254 25.2018 29.8008C25.3272 29.5923 25.4989 29.4293 25.6949 29.3136C25.4103 29.1178 25.2054 28.8334 25.121 28.496C25.0291 28.1292 25.0862 27.7487 25.2808 27.4245C25.4751 27.1001 25.7845 26.8709 26.1511 26.7792C26.7224 26.7366 26.9439 26.7938 27.1474 26.9003C27.1599 26.6367 27.2384 26.3778 27.3924 26.1556C27.8149 25.5461 28.6611 25.3774 29.3203 25.773L34.7799 29.0478L34.0762 27.7802C33.8062 27.2963 33.8161 26.6993 34.1023 26.222C34.3882 25.5548 35.0871 25.5034 35.2963 25.5034C35.7456 25.5037 36.1819 25.7407 36.4142 26.1603L38.8587 30.5618C38.8816 30.595 38.9506 30.6939 39.0098 30.778C40.5529 32.6626 40.7174 34.8265 39.6183 36.6581Z"
          fill="#99A9F7"
        />
      </svg>
    ),
  },
];

const pricingPlans = [
  {
    name: "Starter",
    monthlyPrice: 2360,
    yearlyPrice: 22656, // 20% discount on 12 months (24000 * 0.8)
    description:
      "Perfect for consultants who need technical support and have their own marketing setup.",
    buttonStyle: "secondary",
    monthlyLink: "https://rzp.io/rzp/tSv8fQBY",
    yearlyLink: "https://rzp.io/rzp/uoqGhu5",
    features: [
      
      "Personal 1 TB Storage space",
      "Online meetings + Recording setup",
      "Quotation Maker",
      "Access to Nakksha's pro email ID",
      "Access to Microsoft AI tools",
      "Client and Session reports",
      "Manual addition of clients",
      "Personal landing page for clients",
      "Personal settings page",
      "Revenue Calculator",
      "Personal unique URL",
      "Personal Marketing Templates"
    ],
  },
  {
    name: "Growth",
    monthlyPrice: 3540,
    yearlyPrice: 33984, // 20% discount on 12 months (36000 * 0.8)
    description:
      "Perfect for consultants who need technical support and a personal marketing advisor.",
    buttonStyle: "primary",
    gradient: true,
    monthlyLink: "https://rzp.io/rzp/LzlqNyNz",
    yearlyLink: "https://rzp.io/rzp/hX2RVgu9",
    features: [
      "Personal 1 TB Storage space",
      "Online meetings + Recording setup",
      "Quotation Maker",
      "Access to Nakksha's pro email ID",
      "Access to Microsoft AI tools",
      "Client and Session reports",
      "Manual addition of clients",
      "Personal landing page for clients",
      "Personal settings page",
      "Revenue Calculator",
      "Personal unique URL",
      "Personal Marketing Advisor",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 5900,
    yearlyPrice: 56640, // 20% discount on 12 months (60000 * 0.8)
    description:
      "Perfect for consultants looking for a complete tech and marketing solution. A campaign manager and video editor will be provided.",
    buttonStyle: "secondary",
    monthlyLink: "https://rzp.io/rzp/fT0aYVe",
    yearlyLink: "https://rzp.io/rzp/dZaofQyo",
    features: [
      "Personal 1 TB Storage space",
      "Online meetings + Recording setup",
      "Quotation Maker",
      "Access to Nakksha's pro email ID",
      "Access to Microsoft AI tools",
      "Client and Session reports",
      "Manual addition of clients",
      "Personal landing page for clients",
      "Personal settings page",
      "Revenue Calculator",
      "Personal unique URL",
      "Personal Digital Marketing Campaign Manager",
      "Personal Video Editor",
    ],
  },
];

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.87012 0.719727C8.09009 0.719727 6.35003 1.24757 4.86999 2.2365C3.38995 3.22543 2.23639 4.63104 1.55521 6.27558C0.874017 7.92011 0.695787 9.72971 1.04305 11.4755C1.39032 13.2214 2.24749 14.825 3.50616 16.0837C4.76483 17.3424 6.36848 18.1995 8.11431 18.5468C9.86014 18.8941 11.6697 18.7158 13.3143 18.0346C14.9588 17.3535 16.3644 16.1999 17.3533 14.7199C18.3423 13.2398 18.8701 11.4998 18.8701 9.71973C18.8701 7.33278 17.9219 5.04359 16.2341 3.35577C14.5463 1.66794 12.2571 0.719727 9.87012 0.719727ZM14.1001 7.17973L9.66012 13.3397C9.52787 13.5183 9.33486 13.6423 9.11749 13.6883C8.90012 13.7344 8.67342 13.6993 8.48012 13.5897L5.93012 12.0997C5.72325 11.9751 5.57437 11.7734 5.51624 11.5389C5.4581 11.3045 5.49547 11.0566 5.62012 10.8497C5.74477 10.6429 5.9465 10.494 6.18092 10.4358C6.41534 10.3777 6.66325 10.4151 6.87012 10.5397L8.68012 11.6197L12.6801 6.12973C12.8286 5.981 13.0244 5.88891 13.2336 5.86942C13.4429 5.84993 13.6523 5.90427 13.8257 6.02302C13.999 6.14176 14.1254 6.31743 14.1828 6.51957C14.2403 6.7217 14.2252 6.93756 14.1401 7.12973L14.1001 7.17973Z"
      fill="#4A3AFF"
    />
  </svg>
);

export default function HomePage() {
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-[#F5F7FA] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="p-8">
              <img
                src="/assets/NakkshaBigLogo.svg"
                alt="Logo"
                className="w-[179px] h-[74px] rounded-lg"
              />
            </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              <Link
                href="#home"
                className="text-[#18191F] font-medium text-base hover:text-[#5570F1] transition-colors"
              >
                Home
              </Link>
              <Link
                href="#features"
                className="text-[#18191F] text-base hover:text-[#5570F1] transition-colors"
              >
                Features
              </Link>
              <Link
                href="#about"
                className="text-[#18191F] text-base hover:text-[#5570F1] transition-colors"
              >
                What is Nakksha?
              </Link>
              <Link
                href="#pricing"
                className="text-[#18191F] text-base hover:text-[#5570F1] transition-colors"
              >
                Pricing
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="bg-[#F5F7FA] text-[#5570F1] font-bold border-none hover:bg-gray-100"
                >
                  Dashboard
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="bg-[#F5F7FA] text-[#5570F1] border-none hover:bg-gray-100"
                >
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-[#5570F1] text-white hover:bg-[#4A5CE6]">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-[#F5F7FA] py-24" id="home">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#4D4D4D] leading-tight mb-6">
                <span className="font-bold">
                  You focus on consultancy, we handle tech and marketing
                </span>
              </h1>
              <p className="text-lg md:text-xl text-[#717171] mb-8">
                A tool to grow your online consultancy business.
              </p>
              <Link href="/signup">
              <Button className="bg-[#5570F1] text-white hover:bg-[#4A5CE6] px-8 py-3 text-base font-semibold">
                Sign Up
              </Button>
              </Link>
            </div>

            {/* Right Image */}
            <div className="flex-1">
              <div className="relative">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/ec574915b3a64c378c42b42d3e0c9c7b5ecabf42?width=782"
                  alt="Consultancy Platform Illustration"
                  className="w-full h-auto max-w-md mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-24" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#4D4D4D] mb-4">
              Manage your online consultancy business with a single system
            </h2>
            <p className="text-base text-[#717171]">Nakksha is best for</p>
          </div>

          {/* Consultant Types */}
          <div className="grid md:grid-cols-3 gap-8">
            {consultantTypes.map((type, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center hover:shadow-md transition-shadow"
              >
                <CardContent className="p-0">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto bg-[#E8F5E9] rounded-lg flex items-center justify-center relative">
                      <div className="absolute inset-2 bg-[#E8F5E9] rounded-lg"></div>
                      <div className="relative z-10">{type.icon}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold text-[#4D4D4D] mb-4">
                    {type.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-[#717171] leading-relaxed">
                    {type.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured In Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#4D4D4D] mb-4">
              Featured in
            </h2>
            <p className="text-base text-[#717171]">
              We have been featured in some of the prominent articles and
              platforms
            </p>
          </div>

          {/* Client Logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/161faa409fc8e4af6540c82aa12d911a94b8e781?width=202"
              alt="Client Logo"
              className="h-16 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/07066a6332511610e2b2fd6439aa5d4c1d1d9a5e?width=182"
              alt="Client Logo"
              className="h-16 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/6a4b8e07fe5a17d2b7218c468c1554bc5797ae31?width=204"
              alt="Client Logo"
              className="h-16 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/ac5eb5e37bff05d3ce128af123d25e070e2d10a7?width=190"
              alt="Client Logo"
              className="h-16 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </section>

      {/* India Section */}
      <section className="py-16 bg-[#F5F7FA]" id="about">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#4D4D4D] mb-4">
            Helping{" "}
            <span className="text-[#53545C]">
              consultants to reach clients anywhere in India 🇮🇳
            </span>
          </h2>
          <p className="text-lg text-[#18191F]">
            We provide consultants with tools to provide consultancy nationally.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-[#F1F2F9] rounded-xl p-1 flex items-center gap-6">
              <button
                onClick={() => setIsAnnualBilling(false)}
                className={`rounded-lg px-4 py-3 transition-all ${
                  !isAnnualBilling
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/50"
                }`}
              >
                <span className="text-[#170F49] font-medium">
                  Monthly billing
                </span>
              </button>
              <button
                onClick={() => setIsAnnualBilling(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  isAnnualBilling
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/50"
                }`}
              >
                <span className="text-[#170F49] font-medium">
                  Annually billing
                </span>
                <Badge className="bg-[#D9DBE9] text-[#6F6C8F] text-xs">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`overflow-hidden shadow-lg ${
                  plan.gradient ? "border-[#F1F2F9]" : "border-[#F1F2F9]"
                }`}
              >
                {/* Top Card */}
                <div
                  className={`p-8 ${
                    plan.gradient
                      ? "bg-gradient-to-b from-[#F1F0FB] to-white"
                      : "bg-white"
                  }`}
                >
                  <h3 className="text-2xl font-medium text-[#170F49] mb-12">
                    {plan.name}
                  </h3>

                  {/* Pricing */}
                  <div className="flex items-end gap-2 mb-12">
                    <span className="text-5xl md:text-6xl font-bold text-[#170F49]">
                      ₹{isAnnualBilling ? Math.floor(plan.yearlyPrice / 12).toLocaleString() : plan.monthlyPrice.toLocaleString()}
                    </span>
                    <div className="flex flex-col text-[#A0A3BD] text-base">
                      <span>per user</span>
                      <span>{isAnnualBilling ? "monthly" : "monthly"}</span>
                    </div>
                  </div>
                  {isAnnualBilling && (
                    <div className="mb-6">
                      <p className="text-sm text-[#6F6C8F]">
                        Billed annually: ₹{plan.yearlyPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        Save ₹{(plan.monthlyPrice * 12 - plan.yearlyPrice).toLocaleString()} per year
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-[#514F6E] mb-10 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* CTA Button */}
                  <Link 
                    href={isAnnualBilling ? plan.yearlyLink : plan.monthlyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      className={`w-full py-4 text-lg font-medium rounded-xl ${
                        plan.buttonStyle === "primary"
                          ? "bg-gradient-to-r from-[#8C82FF] to-[#4A3AFF] text-white shadow-lg"
                          : "bg-white border border-[#D9DBE9] text-[#514F6E] hover:bg-gray-50"
                      }`}
                    >
                      Get started
                    </Button>
                  </Link>
                </div>

                {/* Bottom Card - Features */}
                <div className="p-8 bg-white border-t border-[#F1F2F9]">
                  <h4 className="text-lg font-medium text-[#170F49] mb-4">
                    Features:
                  </h4>
                  <p className="text-[#6F6C8F] mb-6">
                    Access to entire technical dashboard
                    {index > 0 ? ", plus:" : ""}
                  </p>

                  <div className="space-y-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-start gap-3"
                      >
                        <CheckIcon />
                        <span
                          className={`text-[#6F6C8F] text-sm leading-tight ${
                            (feature.includes("Personal Marketing Advisor") ||
                              feature.includes(
                                "Personal Digital Marketing Campaign Manager",
                              ) ||
                              feature.includes("Personal Video Editor")) &&
                            "font-bold"
                          }`}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-[#6D83EC] mb-8 leading-tight">
            You focus on your business. We&apos;ve got tech & marketing fully
            covered.
          </h2>
          <Link href="/signup">
          <Button className="bg-[#5570F1] text-white hover:bg-[#4A5CE6] px-8 py-3 text-base font-medium">
            Register Now
            <svg
              width="16"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2"
            >
              <path
                d="M11.7502 11L14.2199 8.53026C14.5129 8.23736 14.5129 7.76248 14.2199 7.46958L11.7502 4.99984M14.0003 7.99992L3 7.99992"
                stroke="white"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#6D83EC] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="mb-8">
                <p className="text-[#F5F7FA] text-sm mb-2">
                  Copyright © 2025 The Nakksha Group
                </p>
                <p className="text-[#F5F7FA] text-sm">All rights reserved</p>
              </div>

              {/* Social Links */}
              <div className="flex space-x-4">
                <Link 
                  href="https://www.instagram.com/nakkshagrow/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Instagram size={16} className="text-white" />
                </Link>
                <Link 
                  href="https://www.linkedin.com/company/nakksha-the-naksha-group/?viewAsMember=true" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Linkedin size={16} className="text-white" />
                </Link>
                <Link 
                  href="https://www.youtube.com/@TheNakshaGroup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Youtube size={16} className="text-white" />
                </Link>
                <Link 
                  href="https://x.com/nakksha_tng" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Twitter size={16} className="text-white" />
                </Link>
              </div>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold text-xl mb-6">Company</h4>
              <div className="space-y-7">
                <p className="text-[#F5F7FA] flex-row text-sm transition-colors">
                Nakksha <br></br>
A platform to start and grow online consultancy. We don’t just support, we take charge of your tech, marketing & growth.<br></br>
The Nakksha Group <br></br>
Nagpur, Maharashtra - 440015 <br></br>
P: +91-9307973337; E: <a href= "mailto:booking@nakksha.in"> booking@nakksha.in</a> <br></br>
GST: 27BRKPN2343D1ZW
                </p>
              </div>
            </div>

            {/* Empty column for spacing */}
            <div></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
