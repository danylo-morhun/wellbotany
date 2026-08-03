import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "inpost-geowidget": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        token: string;
        onpoint?: string;
        language?: string;
        config?: string;
      };
    }
  }
}
