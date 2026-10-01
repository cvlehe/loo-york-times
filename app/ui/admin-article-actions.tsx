"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteArticle,
  type DeleteArticleState,
} from "@/app/admin/articles/new/actions";

const initialState: DeleteArticleState = { message: "", status: "idle" };

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? "Deleting..." : "Delete"}</button>;
}

export function AdminArticleActions({ articleId }: { articleId: string }) {
  const [state, formAction] = useActionState(deleteArticle, initialState);

  return (
    <div className="admin-article-actions">
      <Link href={`/admin/articles/new?articleId=${encodeURIComponent(articleId)}`}>Edit</Link>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm("Are you sure you want to delete this article?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="articleId" type="hidden" value={articleId} />
        <DeleteButton />
      </form>
      {state.message ? <p className="form-message form-message-error" role="alert">{state.message}</p> : null}
    </div>
  );
}
