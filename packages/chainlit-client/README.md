# @acme/chainlit-client

A small React helper that composes `@chainlit/react-client` providers with the shared `ChainlitDrawer` UI.

## Install

```bash
pnpm add @acme/chainlit-client @chainlit/react-client
```

Peer deps: react, react-dom.

## Usage

```tsx
import { useState } from 'react';
import { ChainlitChatDrawer } from '@acme/chainlit-client';

export default function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open Chat</button>
      <ChainlitChatDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Assistant"
        serverUrl={import.meta.env.VITE_CHAINLIT_URL}
      />
    </>
  );
}
```

## Reference

- Chainlit custom frontend example: https://github.com/Chainlit/cookbook/tree/main/custom-frontend
- Docs: https://docs.chainlit.io/deploy/react/installation-and-setup
