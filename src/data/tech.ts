// Tech stack data
export type TechCategory = "lang" | "build" | "infra";
export interface TechItem {
  name: string;
  slug: string;
  bg: string;
  fg: string;
  group: TechCategory;
}

export const TECH: TechItem[] = [
  { name: "JavaScript", slug: "javascript", bg: "#F7DF1E", fg: "#000", group: "lang" },
  { name: "TypeScript", slug: "typescript", bg: "#3178C6", fg: "#fff", group: "lang" },
  { name: "React",      slug: "react",      bg: "#61DAFB", fg: "#000", group: "lang" },
  { name: "Next",       slug: "nextdotjs",  bg: "#000000", fg: "#fff", group: "lang" },
  { name: "Redux",      slug: "redux",      bg: "#764ABC", fg: "#fff", group: "lang" },
  { name: "Vue",        slug: "vuedotjs",   bg: "#4FC08D", fg: "#fff", group: "lang" },
  { name: "Nuxt",       slug: "nuxtdotjs",  bg: "#00DC82", fg: "#000", group: "lang" },
  { name: "Svelte",     slug: "svelte",     bg: "#FF3E00", fg: "#fff", group: "lang" },
  { name: "Node",       slug: "nodedotjs",  bg: "#5FA04E", fg: "#fff", group: "lang" },
  { name: "Bun",        slug: "bun",        bg: "#FBF0DF", fg: "#000", group: "lang" },
  { name: "Express",    slug: "express",    bg: "#000000", fg: "#fff", group: "lang" },
  { name: "Fastify",    slug: "fastify",    bg: "#000000", fg: "#fff", group: "lang" },
  { name: "TailwindCSS", slug: "tailwindcss", bg: "#06B6D4", fg: "#fff", group: "build" },
  { name: "Styled",     slug: "styledcomponents", bg: "#DB7093", fg: "#fff", group: "build" },
  { name: "Sass",       slug: "sass",       bg: "#CC6699", fg: "#fff", group: "build" },
  { name: "Jest",       slug: "jest",       bg: "#C21325", fg: "#fff", group: "build" },
  { name: "Webpack",    slug: "webpack",    bg: "#8DD6F9", fg: "#000", group: "build" },
  { name: "Vite",       slug: "vite",       bg: "#646CFF", fg: "#fff", group: "build" },
  { name: "PNPM",       slug: "pnpm",       bg: "#F69220", fg: "#fff", group: "build" },
  { name: "NPM",        slug: "npm",        bg: "#CB3837", fg: "#fff", group: "build" },
  { name: "Yarn",       slug: "yarn",       bg: "#2C8EBB", fg: "#fff", group: "build" },
  { name: "Git",        slug: "git",        bg: "#F05032", fg: "#fff", group: "build" },
  { name: "Docker",     slug: "docker",     bg: "#2496ED", fg: "#fff", group: "infra" },
  { name: "Nginx",      slug: "nginx",      bg: "#009639", fg: "#fff", group: "infra" },
  { name: "Gitlab CI",  slug: "gitlab",     bg: "#FC6D26", fg: "#fff", group: "infra" },
  { name: "Github Actions", slug: "githubactions", bg: "#2088FF", fg: "#fff", group: "infra" },
  { name: "Vercel",     slug: "vercel",     bg: "#000000", fg: "#fff", group: "infra" },
  { name: "GNU/Linux",  slug: "linux",      bg: "#000000", fg: "#fff", group: "infra" },
];

export const KEY_SKILLS = [
  "Pragmatic code",
  "Tech selection",
  "Performance",
  "Mentorship",
  "Architecture",
  "Hiring",
];
