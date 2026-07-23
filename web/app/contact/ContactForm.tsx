"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    formData.forEach((value, key) => params.append(key, String(value)));

    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!res.ok) throw new Error("submit failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-2 text-base font-bold text-[var(--ink)]">送信が完了しました</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          ご連絡いただきありがとうございます。内容を確認のうえ、必要に応じてご記入いただいたメールアドレス宛にご返信いたします。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-5">
      <h2 className="mb-2 text-base font-bold text-[var(--ink)]">お問い合わせフォーム</h2>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">
        いただいた内容は、お問い合わせへの回答以外の目的では利用しません。返信をご希望の場合は、メールアドレスをご記入ください。
      </p>

      <form name="contact" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="form-name" value="contact" />
        <p className="hidden">
          <label>
            入力しないでください
            <input name="bot-field" />
          </label>
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs font-bold text-[var(--ink-soft)]">
            お名前
          </label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="山田 太郎"
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-bold text-[var(--ink-soft)]">
            メールアドレス(返信をご希望の場合)
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="example@example.com"
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="message" className="text-xs font-bold text-[var(--ink-soft)]">
            お問い合わせ内容
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="ご質問・ご意見・店舗追加のご要望・不具合報告など"
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          />
        </div>

        {status === "error" && (
          <p className="text-sm font-bold text-[var(--down)]">送信に失敗しました。時間をおいて再度お試しください。</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-bold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "送信中…" : "送信する"}
        </button>
      </form>
    </div>
  );
}
