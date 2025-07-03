import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

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
    price: "INR 2000",
    subtitle: "per user monthly",
    description:
      "Perfect for consultants who need technical support and have their own marketing setup.",
    buttonStyle: "secondary",
    features: [
      "Access to entire technical dashboard",
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
    ],
  },
  {
    name: "Growth",
    price: "INR 3000",
    subtitle: "per user monthly",
    description:
      "Perfect for consultants who need technical support and a personal marketing advisor.",
    buttonStyle: "primary",
    gradient: true,
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
    price: "INR 5000",
    subtitle: "per user monthly",
    description:
      "Perfect for consultants looking for a complete tech and marketing solution. A campaign manager and video editor will be provided.",
    buttonStyle: "secondary",
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
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-[#F5F7FA] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <svg
                width="164"
                height="39"
                viewBox="0 0 164 39"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-auto"
              >
                <path
                  d="M39.9023 36.7881V1.75183C39.2472 0.136408 38.5479 -0.0612625 36.9683 0.29198C35.6106 1.2088 31.0027 3.31533 29.3399 4.9607C29.0231 5.27414 28.8133 5.57084 28.7531 5.8394V33.2845C28.8853 33.5733 29.0009 33.7078 29.3399 33.8685L36.9683 38.8319C39.1637 39.268 39.9114 38.9455 39.9023 36.7881Z"
                  fill="#F2AE31"
                />
                <path
                  d="M8.34055e-05 36.6448V1.60848C0.655096 -0.00693909 1.35441 -0.20461 2.93407 0.148633C4.29179 1.06545 8.89968 3.17198 10.5624 4.81735C10.8792 5.13079 11.0891 5.42749 11.1492 5.69605V33.1412C11.017 33.4299 10.9014 33.5645 10.5624 33.7251L2.93407 38.6886C0.738657 39.1246 -0.00909986 38.8021 8.34055e-05 36.6448Z"
                  fill="#F2AE31"
                />
                <path
                  d="M24.0587 31.2407L16.1369 13.7225C15.0311 11.9307 14.4591 12.0776 13.4964 13.7225V31.2407C13.5273 33.0146 13.907 33.6015 15.5502 33.5764H23.1785C24.7762 33.5799 24.8236 32.9624 24.0587 31.2407Z"
                  fill="#F2AE31"
                />
                <path
                  d="M15.7375 7.59196L23.6592 25.1101C24.7651 26.9019 25.3371 26.755 26.2998 25.1101V7.59196C26.2689 5.81806 25.8892 5.23113 24.246 5.25621H16.6177C15.02 5.2527 14.9726 5.87026 15.7375 7.59196Z"
                  fill="#F2AE31"
                />
                <path
                  d="M59.344 28.029H56.5344L48.081 15.3004V28.029H45.2714V10.9594H48.081L56.5344 23.6635V10.9594H59.344V28.029Z"
                  fill="#F2AE31"
                />
                <path
                  d="M64.5616 21.211C64.5616 19.8539 64.8409 18.6522 65.3995 17.6057C65.9746 16.5593 66.7468 15.75 67.7162 15.1777C68.702 14.5891 69.7864 14.2948 70.9694 14.2948C72.0374 14.2948 72.9657 14.5074 73.7543 14.9325C74.5594 15.3412 75.2002 15.8563 75.6767 16.4776V14.5155H78.5109V28.029H75.6767V26.018C75.2002 26.6556 74.5512 27.187 73.7297 27.6121C72.9082 28.0372 71.9716 28.2498 70.9201 28.2498C69.7535 28.2498 68.6856 27.9555 67.7162 27.3669C66.7468 26.7619 65.9746 25.928 65.3995 24.8653C64.8409 23.7862 64.5616 22.5681 64.5616 21.211Z"
                  fill="#F2AE31"
                />
                <path
                  d="M90.0385 21.2846L96.2984 28.029H92.503L87.4753 22.2165V28.029H84.6657V9.88024H87.4753V20.4262L92.4044 14.5155H96.2984L90.0385 21.2846Z"
                  fill="#F2AE31"
                />
                <path
                  d="M106.149 21.2846L112.409 28.029H108.614L103.586 22.2165V28.029H100.777V9.88024H103.586V20.4262L108.515 14.5155H112.409L106.149 21.2846Z"
                  fill="#F2AE31"
                />
                <path
                  d="M121.817 28.2498C120.749 28.2498 119.788 28.0618 118.933 27.6857C118.095 27.2933 117.43 26.7701 116.937 26.1161C116.444 25.4457 116.181 24.7018 116.148 23.8843H119.057C119.106 24.4565 119.377 24.9388 119.87 25.3313C120.379 25.7073 121.012 25.8953 121.768 25.8953C122.556 25.8953 123.164 25.7482 123.591 25.4539C124.035 25.1432 124.257 24.7508 124.257 24.2767C124.257 23.7698 124.01 23.3937 123.517 23.1485C123.041 22.9032 122.277 22.6335 121.225 22.3392C120.207 22.0612 119.377 21.7914 118.736 21.5298C118.095 21.2682 117.537 20.8676 117.06 20.3281C116.6 19.7885 116.37 19.0773 116.37 18.1944C116.37 17.4749 116.584 16.8209 117.011 16.2323C117.438 15.6274 118.046 15.1532 118.835 14.8098C119.64 14.4665 120.56 14.2948 121.595 14.2948C123.14 14.2948 124.38 14.6872 125.317 15.472C126.27 16.2405 126.779 17.2951 126.845 18.6358H124.035C123.986 18.0309 123.739 17.5485 123.296 17.1888C122.852 16.8291 122.252 16.6493 121.497 16.6493C120.757 16.6493 120.19 16.7882 119.796 17.0662C119.402 17.3441 119.204 17.712 119.204 18.1698C119.204 18.5295 119.336 18.832 119.599 19.0773C119.862 19.3225 120.182 19.5187 120.56 19.6659C120.938 19.7967 121.497 19.9684 122.236 20.1809C123.222 20.4425 124.027 20.7123 124.651 20.9903C125.292 21.2519 125.842 21.6443 126.302 22.1675C126.762 22.6907 127.001 23.3856 127.017 24.2521C127.017 25.0206 126.804 25.7073 126.376 26.3123C125.949 26.9172 125.341 27.3914 124.553 27.7347C123.78 28.0781 122.868 28.2498 121.817 28.2498Z"
                  fill="#F2AE31"
                />
                <path
                  d="M139.541 14.2948C140.577 14.2948 141.497 14.5155 142.302 14.957C143.123 15.3985 143.764 16.0525 144.224 16.919C144.701 17.7856 144.939 18.832 144.939 20.0583V28.029H142.154V20.4752C142.154 19.2653 141.85 18.3415 141.242 17.7038C140.634 17.0498 139.804 16.7228 138.753 16.7228C137.701 16.7228 136.863 17.0498 136.239 17.7038C135.631 18.3415 135.327 19.2653 135.327 20.4752V28.029H132.517V9.88024H135.327V16.0852C135.804 15.5129 136.403 15.0715 137.126 14.7608C137.866 14.4501 138.671 14.2948 139.541 14.2948Z"
                  fill="#F2AE31"
                />
                <path
                  d="M150.051 21.211C150.051 19.8539 150.33 18.6522 150.889 17.6057C151.464 16.5593 152.236 15.75 153.205 15.1777C154.191 14.5891 155.275 14.2948 156.458 14.2948C157.526 14.2948 158.455 14.5074 159.243 14.9325C160.048 15.3412 160.689 15.8563 161.166 16.4776V14.5155H164V28.029H161.166V26.018C160.689 26.6556 160.04 27.187 159.219 27.6121C158.397 28.0372 157.461 28.2498 156.409 28.2498C155.243 28.2498 154.175 27.9555 153.205 27.3669C152.236 26.7619 151.464 25.928 150.889 24.8653C150.33 23.7862 150.051 22.5681 150.051 21.211Z"
                  fill="#F2AE31"
                />
              </svg>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              <Link
                href="/Home"
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
              <Link href="/">
                <Button
                  variant="outline"
                  className="bg-[#F5F7FA] text-[#5570F1] border-none hover:bg-gray-100"
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
      <section className="bg-[#F5F7FA] py-24">
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
              <Button className="bg-[#5570F1] text-white hover:bg-[#4A5CE6] px-8 py-3 text-base font-semibold">
                Sign Up
              </Button>
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
      <section className="py-24" id="about">
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
      <section className="py-16 bg-[#F5F7FA]">
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
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                <span className="text-[#170F49] font-medium">
                  Monthly billing
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-[#170F49] font-medium">
                  Annually billing
                </span>
                <Badge className="bg-[#D9DBE9] text-[#6F6C8F] text-xs">
                  Save 20%
                </Badge>
              </div>
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
                      {plan.price}
                    </span>
                    <div className="flex flex-col text-[#A0A3BD] text-base">
                      <span>per user</span>
                      <span>monthly</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#514F6E] mb-10 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* CTA Button */}
                  <Button
                    className={`w-full py-4 text-lg font-medium rounded-xl ${
                      plan.buttonStyle === "primary"
                        ? "bg-gradient-to-r from-[#8C82FF] to-[#4A3AFF] text-white shadow-lg"
                        : "bg-white border border-[#D9DBE9] text-[#514F6E] hover:bg-gray-50"
                    }`}
                  >
                    Get started
                  </Button>
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
            You focus on your business. We've got tech & marketing fully
            covered.
          </h2>
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
                  Copyright © 2025 The Naksha Group
                </p>
                <p className="text-[#F5F7FA] text-sm">All rights reserved</p>
              </div>

              {/* Social Links */}
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.0007 7.4668C13.6832 7.4668 13.3923 7.47693 12.4821 7.51835C11.5736 7.55995 10.9535 7.70378 10.4109 7.9148C9.84969 8.13276 9.37359 8.42432 8.89928 8.89881C8.42461 9.37313 8.13305 9.84922 7.91438 10.4103C7.70282 10.9531 7.55882 11.5733 7.51793 12.4814C7.47722 13.3917 7.46655 13.6827 7.46655 16.0002C7.46655 18.3178 7.47686 18.6077 7.51811 19.5179C7.55989 20.4264 7.70371 21.0465 7.91456 21.5891C8.13269 22.1503 8.42425 22.6264 8.89875 23.1007C9.37288 23.5754 9.84898 23.8677 10.4099 24.0856C10.9528 24.2967 11.5731 24.4405 12.4814 24.4821C13.3916 24.5235 13.6823 24.5336 15.9996 24.5336C18.3173 24.5336 18.6073 24.5235 19.5175 24.4821C20.426 24.4405 21.0468 24.2967 21.5897 24.0856C22.1508 23.8677 22.6262 23.5754 23.1003 23.1007C23.575 22.6264 23.8665 22.1503 24.0852 21.5893C24.295 21.0465 24.439 20.4262 24.4817 19.5181C24.5226 18.6079 24.5332 18.3178 24.5332 16.0002C24.5332 13.6827 24.5226 13.3918 24.4817 12.4816C24.439 11.5732 24.295 10.9531 24.0852 10.4105C23.8665 9.84922 23.575 9.37313 23.1003 8.89881C22.6256 8.42414 22.151 8.13258 21.5892 7.9148C21.0452 7.70378 20.4247 7.55995 19.5163 7.51835C18.606 7.47693 18.3163 7.4668 15.998 7.4668H16.0007Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M15.5208 13.0051L15.5544 13.5587L14.9948 13.4909C12.9579 13.2311 11.1784 12.3498 9.66756 10.8696L8.92891 10.1352L8.73865 10.6776C8.33575 11.8865 8.59316 13.1633 9.43253 14.022C9.8802 14.4965 9.77948 14.5643 9.00725 14.2819C8.73865 14.1915 8.50363 14.1237 8.48124 14.1576C8.4029 14.2367 8.6715 15.2648 8.88414 15.6716C9.17513 16.2365 9.76828 16.7902 10.4174 17.1178L10.9658 17.3777L10.3167 17.389C9.68994 17.389 9.66756 17.4003 9.73471 17.6376C9.95854 18.372 10.8427 19.1516 11.8276 19.4906L12.5214 19.7278L11.9171 20.0894C11.0218 20.6091 9.96973 20.9029 8.91772 20.9255C8.41409 20.9368 8 20.982 8 21.0159C8 21.1289 9.36538 21.7616 10.16 22.0102C12.5438 22.7446 15.3753 22.4282 17.5017 21.1741C19.0126 20.2815 20.5235 18.5076 21.2286 16.7902C21.6091 15.875 21.9896 14.2028 21.9896 13.4006C21.9896 12.8808 22.0232 12.813 22.6499 12.1916C23.0192 11.83 23.3662 11.4346 23.4333 11.3216C23.5452 11.1069 23.534 11.1069 22.9633 11.299C22.012 11.638 21.8777 11.5928 22.3477 11.0843C22.6947 10.7228 23.1088 10.0674 23.1088 9.87536C23.1088 9.84146 22.9409 9.89796 22.7506 9.99964C22.5492 10.1126 22.1015 10.2821 21.7658 10.3838L21.1614 10.5759L20.613 10.203C20.3108 9.99964 19.8856 9.77367 19.6617 9.70588C19.0909 9.5477 18.218 9.57029 17.7032 9.75107C16.3042 10.2595 15.4201 11.5702 15.5208 13.0051Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M22.6679 10.4995C23.4022 10.701 23.9805 11.2948 24.1768 12.0488C24.5335 13.4153 24.5335 16.2666 24.5335 16.2666C24.5335 16.2666 24.5335 19.1178 24.1768 20.4845C23.9805 21.2385 23.4022 21.8322 22.6679 22.0338C21.3371 22.4 16.0001 22.4 16.0001 22.4C16.0001 22.4 10.6632 22.4 9.3323 22.0338C8.59795 21.8322 8.01962 21.2385 7.82335 20.4845C7.4668 19.1178 7.4668 16.2666 7.4668 16.2666C7.4668 16.2666 7.4668 13.4153 7.82335 12.0488C8.01962 11.2948 8.59795 10.701 9.3323 10.4995C10.6632 10.1333 16.0001 10.1333 16.0001 10.1333C16.0001 10.1333 21.3371 10.1333 22.6679 10.4995Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M24.5332 15.9883C24.5332 16.5654 24.4745 17.1417 24.3591 17.7034C24.2465 18.2518 24.0799 18.7902 23.8615 19.3049C23.6482 19.8105 23.3836 20.2977 23.0744 20.7521C22.7698 21.2036 22.419 21.6271 22.0335 22.0133C21.6473 22.3977 21.2222 22.7476 20.771 23.0535C20.3151 23.3605 19.8272 23.6247 19.3213 23.8391C18.8059 24.0562 18.2662 24.2227 17.7183 24.335C17.1558 24.4507 16.5774 24.5098 15.9995 24.5098C15.4211 24.5098 14.8428 24.4507 14.2811 24.335C13.7323 24.2227 13.1927 24.0562 12.6777 23.8391C12.1718 23.6247 11.6834 23.3605 11.2276 23.0535C10.7763 22.7476 10.3513 22.3977 9.96587 22.0133C9.58003 21.6271 9.22915 21.2036 8.92414 20.7521C8.61663 20.2977 8.35159 19.8105 8.13743 19.3049C7.91906 18.7902 7.75199 18.2518 7.63907 17.7034C7.5249 17.1417 7.46655 16.5654 7.46655 15.9883C7.46655 15.4108 7.52487 14.8332 7.6391 14.2727C7.75203 13.7243 7.91909 13.1851 8.13747 12.6712C8.35163 12.1653 8.61666 11.6776 8.92418 11.2232C9.22919 10.7714 9.58006 10.3486 9.9659 9.96207C10.3513 9.57759 10.7764 9.22852 11.2276 8.92312C11.6835 8.61478 12.1719 8.35059 12.6777 8.13587C13.1927 7.91822 13.7323 7.75139 14.2811 7.63989C14.8428 7.52506 15.4212 7.4668 15.9995 7.4668C16.5775 7.4668 17.1558 7.52506 17.7184 7.63989C18.2663 7.75142 18.8059 7.91825 19.3214 8.13587C19.8272 8.35056 20.3152 8.61478 20.771 8.92312C21.2223 9.22852 21.6473 9.57759 22.0336 9.96207C22.419 10.3486 22.7699 10.7714 23.0745 11.2232C23.3836 11.6776 23.6482 12.1653 23.8615 12.6712C24.0799 13.1851 24.2465 13.7243 24.3591 14.2727C24.4745 14.8332 24.5332 15.4108 24.5332 15.9883Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold text-xl mb-6">Company</h4>
              <div className="space-y-3">
                <p className="text-[#F5F7FA] text-sm hover:text-white cursor-pointer transition-colors">
                  About us
                </p>
                <p className="text-[#F5F7FA] text-sm hover:text-white cursor-pointer transition-colors">
                  Contact us
                </p>
                <p className="text-[#F5F7FA] text-sm hover:text-white cursor-pointer transition-colors">
                  Pricing
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
