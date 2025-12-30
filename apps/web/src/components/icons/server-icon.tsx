import { createElement } from "react";

export const ServerIcon = ({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) =>
  createElement(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    },
    createElement("path", {
      fill: "currentColor",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M5 12h14M12 5v14M2 12h20",
    }),
  );

export const TrashIcon = ({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) =>
  createElement(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    },
    createElement("path", {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 6h18M19 6v14a2 2 0 0 01-2 2H8a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
    }),
  );

export const PlusIcon = ({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) =>
  createElement(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    },
    createElement("path", {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M12 4v16m8-8H8",
    }),
  );
