// Central strings module. UI text comes from `strings`; swap `en` for another catalogue to localise (task 2.11).
import { en, type Strings } from './en';
import { format } from './format';

export const strings: Strings = en;
export { format };
export type { Strings };
