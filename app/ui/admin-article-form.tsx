"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  saveArticle,
  type ArticleFormState,
} from "@/app/admin/articles/new/actions";

const initialState: ArticleFormState = { message: "", status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? "Saving..." : "Save"}</button>;
}

type AdminArticleFormProps = {
  article?: {
    id: string;
    imageUrl: string | null;
    title: string;
    url: string;
  };
};

export function AdminArticleForm({ article }: AdminArticleFormProps) {
  const [state, formAction] = useActionState(saveArticle, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.articleId && !article) formRef.current?.reset();
  }, [article, state.articleId]);

  return (
    <form action={formAction} className="admin-article-form" ref={formRef}>
      {article ? <input name="articleId" type="hidden" value={article.id} /> : null}
      <label htmlFor="article-title">Title <span aria-hidden="true">*</span></label>
      <input defaultValue={article?.title} id="article-title" maxLength={200} name="title" required type="text" />

      <label htmlFor="article-url">Article URL <span aria-hidden="true">*</span></label>
      <input
        aria-describedby="article-url-help"
        defaultValue={article?.url}
        id="article-url"
        maxLength={2_048}
        name="url"
        placeholder="https://"
        required
        type="url"
      />
      <p className="field-help" id="article-url-help">The title will link directly to this address.</p>

      <label htmlFor="article-image-url">Image URL <span>(optional)</span></label>
      <input
        aria-describedby="article-image-help"
        defaultValue={article?.imageUrl ?? ""}
        id="article-image-url"
        maxLength={2_048}
        name="imageUrl"
        placeholder="https://"
        type="url"
      />
      <p className="field-help" id="article-image-help">Use a publicly accessible http:// or https:// image.</p>

      {state.message ? (
        <div
          aria-live="polite"
          className={`form-message ${state.status === "error" ? "form-message-error" : "form-message-success"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          <p>{state.message}</p>
          {state.status === "success" ? (
            <Link className="text-link" href="/journalism">View journalism page →</Link>
          ) : null}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
