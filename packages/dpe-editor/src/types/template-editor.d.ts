declare module "@acme/template-editor" {
  import * as React from "react";
  export type TemplateEditorModalProps = {
    open: boolean;
    onCancel: () => void;
    baseUrl?: string;
    refAdeme?: string;
    getAccessToken: () => Promise<string | null>;
    onLoaded?: (data: unknown) => void;
  };
  export const TemplateEditorModal: React.FC<TemplateEditorModalProps>;
}


