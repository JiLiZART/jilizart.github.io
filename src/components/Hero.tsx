import React from 'react';
import { FiGithub, FiTwitter, FiLinkedin, FiMessageCircle, FiFileText } from 'react-icons/fi';

const socialLinks = [
  {
    icon: FiGithub,
    href: "https://github.com/jilizart",
    label: "GitHub"
  },
  {
    icon: FiTwitter,
    href: "https://x.com/jilizart",
    label: "Twitter"
  },
  {
    icon: FiLinkedin,
    href: "https://linkedin.com/in/nkosturin",
    label: "LinkedIn"
  },
  {
    icon: FiMessageCircle,
    href: "https://t.me/jilizart",
    label: "Telegram"
  },
  {
    icon: FiFileText,
    href: "#",
    label: "CV"
  }
];

export default function Hero() {
  return (
    <section className="mb-20">
      <div className="flex flex-col md:flex-row items-center gap-12">
        <div className="space-y-6 flex-1">
          <h1 className="text-4xl md:text-5xl font-bold dark:text-white">
            Hey, I'm Nikolay 👋
            <br />
            JavaScript Developer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
            I specialize in building exceptional web applications and creating efficient JavaScript solutions. Currently focusing on exciting new projects and open-source contributions. ✨
          </p>
          <div className="flex flex-wrap gap-4">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                aria-label={label}
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-64 h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-blue-100 dark:from-gray-700 dark:to-gray-600">
            <img
              src="/profile.png"
              alt="Nikolay Kost"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}