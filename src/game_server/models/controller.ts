import { FeResponse } from "./protocol";

export interface ResponseObj {
    delay?: boolean;
    receivers: number[] | 'broadcast';
    payload: FeResponse;
}