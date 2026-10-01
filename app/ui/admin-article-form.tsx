"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
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
    articleType: "external" | "internal";
    body: string | null;
    id: string;
    imageUrl: string | null;
    title: string;
    url: string | null;
  };
};

export function AdminArticleForm({ article }: AdminArticleFormProps) {
  const [state, formAction] = useActionState(saveArticle, initialState);
  const [articleType, setArticleType] = useState(article?.articleType ?? "external");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.articleId && !article) formRef.current?.reset();
  }, [article, state.articleId]);

  return (
    <form action={formAction} className="admin-article-form" ref={formRef}>
      {article ? <input name="articleId" type="hidden" value={article.id} /> : null}
      <fieldset className="article-type-toggle">
        <legend>Article location <span aria-hidden="true">*</span></legend>
        <label>
          <input
            checked={articleType === "external"}
            name="articleType"
            onChange={() => setArticleType("external")}
            type="radio"
            value="external"
          />
          External link
        </label>
        <label>
          <input
            checked={articleType === "internal"}
            name="articleType"
            onChange={() => setArticleType("internal")}
            type="radio"
            value="internal"
          />
          Publish on this site
        </label>
      </fieldset>
      <label htmlFor="article-title">Title <span aria-hidden="true">*</span></label>
      <input defaultValue={article?.title} id="article-title" maxLength={200} name="title" required type="text" />

      {articleType === "external" ? (
        <>
          <label htmlFor="article-url">Article URL <span aria-hidden="true">*</span></label>
          <input
            aria-describedby="article-url-help"
            defaultValue={article?.url ?? ""}
            id="article-url"
            maxLength={2_048}
            name="url"
            placeholder="https://"
            required
            type="url"
          />
          <p className="field-help" id="article-url-help">The title will link directly to this address.</p>
        </>
      ) : (
        <>
          <label htmlFor="article-body">Article body <span aria-hidden="true">*</span></label>
          <textarea
            aria-describedby="article-body-help"
            defaultValue={article?.body ?? ""}
            id="article-body"
            maxLength={50_000}
            name="body"
            required
            rows={16}
          />
          <p className="field-help" id="article-body-help">Use blank lines to separate paragraphs.</p>
        </>
      )}

      <label htmlFor="article-image-url">Header image URL <span>(optional)</span></label>
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
