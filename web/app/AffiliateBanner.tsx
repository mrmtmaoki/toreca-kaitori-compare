// A8.net affiliate creative for オンラインオリパ「どっかん！トレカ」— the
// href/img src (tracking redirects) and the 1x1 tracking pixel must be used
// exactly as issued, not modified or proxied through next/image. "PR"
// label is required disclosure under Japan's stealth-marketing regulation
// (景品表示法, enforced since 2023) for any paid/affiliate promotional link.
export default function AffiliateBanner() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="mono text-[10px] tracking-wider text-[var(--ink-soft)]">PR</span>
      <a href="https://px.a8.net/svt/ejp?a8mat=4B8810+67V08I+5PLE+5YZ75" rel="nofollow noopener" target="_blank">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={300}
          height={250}
          alt="オンラインオリパの【どっかん！トレカ】"
          src="https://www25.a8.net/svt/bgt?aid=260724132376&wid=001&eno=01&mid=s00000026645001003000&mc=1"
        />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        width={1}
        height={1}
        src="https://www12.a8.net/0.gif?a8mat=4B8810+67V08I+5PLE+5YZ75"
        alt=""
        style={{ position: "absolute" }}
      />
    </div>
  );
}
