@acme/chainlit

A simple right-side overlay drawer component.

Install

This is a workspace package. It expects React 18 and Ant Design 5 in the host app.

Usage

```tsx
import { ChainlitDrawer } from "@acme/chainlit";

export function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <ChainlitDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Development

- Build: `pnpm -w -C packages/chainlit build`


