import { useMemo, useState } from "react";

export interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  tag: string;
  readTime: string;
}

interface Props {
  posts: PostMeta[];
}

export default function PostsSearch({ posts }: Props) {
  const [activeTag, setActiveTag] = useState("All");
  const [query, setQuery] = useState("");

  const tags = useMemo(
    () => ["All", ...Array.from(new Set(posts.map((p) => p.tag)))],
    [posts]
  );

  const filtered = useMemo(
    () =>
      posts.filter((p) => {
        if (activeTag !== "All" && p.tag !== activeTag) return false;
        if (query && !(p.title + " " + p.excerpt).toLowerCase().includes(query.toLowerCase()))
          return false;
        return true;
      }),
    [posts, activeTag, query]
  );

  const fmtMonthDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const yearOf = (iso: string) => new Date(iso).getFullYear().toString();

  const byYear = filtered.reduce<Record<string, PostMeta[]>>((acc, p) => {
    const y = yearOf(p.date);
    (acc[y] ||= []).push(p);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div className="posts-toolbar">
        <div className="posts-tags">
          {tags.map((t) => (
            <button
              key={t}
              className={"posts-tag" + (activeTag === t ? " active" : "")}
              onClick={() => setActiveTag(t)}
            >
              {t}
              <span className="posts-tag-count">
                {t === "All" ? posts.length : posts.filter((p) => p.tag === t).length}
              </span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="posts-search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {years.length === 0 && <div className="posts-empty">No posts match that filter.</div>}

      {years.map((year) => (
        <div key={year} className="posts-year-block">
          <div className="posts-year">{year}</div>
          <div className="blog-list">
            {byYear[year].map((p) => (
              <a key={p.slug} href={`/blog/${p.slug}`} className="blog-row">
                <div className="blog-row-date">{fmtMonthDay(p.date)}</div>
                <div className="blog-row-main">
                  <div className="blog-row-tag">
                    {p.tag} <span className="posts-readtime">· {p.readTime}</span>
                  </div>
                  <h3 className="blog-row-title">{p.title}</h3>
                  <p className="blog-row-excerpt">{p.excerpt}</p>
                </div>
                <div className="blog-row-arrow">→</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
