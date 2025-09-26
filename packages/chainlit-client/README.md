# @acme/chainlit-client

A small React helper that composes `@chainlit/react-client` providers with the shared `ChainlitDrawer` UI.

## Install

```bash
pnpm add @acme/chainlit-client @chainlit/react-client recoil
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

### Notes

- Set `serverUrl` to the Chainlit base URL. If Chainlit is served under a subpath, include it. For example:
  - `https://chainlit-stg.etiquettedpe.fr/chainlit` → the client will connect to `https://chainlit-stg.etiquettedpe.fr/chainlit/ws/socket.io/...`.
  - Local dev: `http://localhost:8000` → connects to `/ws/socket.io`.

## Reference

- Chainlit custom frontend example: https://github.com/Chainlit/cookbook/tree/main/custom-frontend
- Docs: https://docs.chainlit.io/deploy/react/installation-and-setup
