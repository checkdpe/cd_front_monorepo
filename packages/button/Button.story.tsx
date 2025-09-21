import React from "react";
import { Button } from "./src/Button";
export default { title: "Button" };
export const Primary = () => <Button label="Click me" />;
export const Ghost = () => <Button label="Ghost" variant="ghost" />;
export const Disabled = () => <Button label="Disabled" disabled />;
