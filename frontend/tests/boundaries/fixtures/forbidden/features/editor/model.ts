import { runtime } from "@app/runtime";
export const editor = runtime;
export const loadEditor = () => fetch("/api/editor");export const legacyStudio = window.SerreStudio;
