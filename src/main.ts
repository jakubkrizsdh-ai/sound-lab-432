import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { i18n } from './lib/i18n/index.svelte';

document.documentElement.lang = i18n.locale;
const app = mount(App, { target: document.getElementById('app')! });
export default app;
