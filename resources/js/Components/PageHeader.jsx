import React from "react";
import classNames from "classnames";

export default function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className = "",
}) {
  return (
    <div
      className={classNames(
        "rounded-[32px] border border-blue-100/70 bg-white px-6 py-4 shadow-sm",
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {subtitle && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {subtitle}
          </p>
        )}
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
