import { runtime } from "@app/runtime";
export const editor = runtime;
export const loadEditor = () => fetch("/api/editor");