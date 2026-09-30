import { DEFAULT_PORT } from '../constants/env.js';

/** The suite drives a running server over HTTP, so it can check the real contract. */
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || DEFAULT_PORT}`;

/** Running totals for the whole suite. */
const state = { checks: 0, failures: 0 };

/** Each actor keeps its own cookie, so an admin session and a user session can coexist. */
const jars = new Map();

/** The jar name used when the caller does not name one. */
const DEFAULT_JAR = 'default';

/**
 * DOCU: Stores the cookies from a response in the named jar.
 * Last Updated Date: October 1, 2026
 * @function captureCookies
 * @param {object} res - The fetch response
 * @param {string} [jar] - The jar to store the cookies in
 * @returns {void} Updates the jar
 * @author Cesar
 */
const captureCookies = (res, jar) => {
    for (const entry of res.headers.getSetCookie?.() ?? []) {
        const [pair] = entry.split(';');
        if (!pair.includes('=')) continue;

        const [name, value] = pair.split('=');
        if (value === '') jars.delete(jar ?? DEFAULT_JAR);
        else jars.set(jar ?? DEFAULT_JAR, pair);
    }
};

/**
 * DOCU: Sends a literal cookie value, to test a forged session.
 * Last Updated Date: October 1, 2026
 * @function setCookie
 * @param {string} jar - The jar to write to
 * @param {string} value - The cookie value; empty clears the jar
 * @returns {void} Updates the jar
 * @author Cesar
 */
const setCookie = (jar, value) => {
    if (value) jars.set(jar, value);
    else jars.delete(jar);
};

/**
 * DOCU: Empties a cookie jar.
 * Last Updated Date: October 1, 2026
 * @function clearCookie
 * @param {string} [jar] - The jar to clear
 * @returns {void} Empties the jar
 * @author Cesar
 */
const clearCookie = (jar = DEFAULT_JAR) => {
    jars.delete(jar);
};

/**
 * DOCU: Makes an API request and returns the status plus the parsed body.
 * Last Updated Date: October 1, 2026
 * @function req
 * @param {string} method - The HTTP verb
 * @param {string} path - The path, including any query string
 * @param {object} [body] - The JSON body
 * @param {object} [options] - { jar, auth, cookie }
 * @returns {Promise<{status: number, data: object|string}>} The status and body
 * @author Cesar
 */
const req = async (method, path, body, { jar = DEFAULT_JAR, auth = true, cookie } = {}) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

    if (cookie) headers.Cookie = cookie;
    else if (auth && jars.has(jar)) headers.Cookie = jars.get(jar);

    let res;
    try {
        res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new Error(`Could not reach the API at ${BASE}. Is the server running?`);
    }

    captureCookies(res, jar);

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    return { status: res.status, data };
};

/**
 * DOCU: Records a pass or fail.
 * Last Updated Date: October 1, 2026
 * @function check
 * @param {string} label - What the check is called
 * @param {*} actual - The value received
 * @param {*} expected - The value expected
 * @returns {void} Records the result and prints it
 * @author Cesar
 */
const check = (label, actual, expected) => {
    state.checks++;

    const ok = Array.isArray(expected)
        ? JSON.stringify(actual) === JSON.stringify(expected)
        : actual === expected;

    if (!ok) state.failures++;

    console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${label}: got ${JSON.stringify(actual)}${
            ok ? '' : ` (expected ${JSON.stringify(expected)})`
        }`
    );
};

/**
 * DOCU: Logs a response without asserting on it.
 * Last Updated Date: October 1, 2026
 * @function show
 * @param {string} label - What the request was
 * @param {object} res - The status and body
 * @returns {void} Prints the response
 * @author Cesar
 */
const show = (label, res) => {
    console.log(`      -> ${label} ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
};

/**
 * DOCU: Makes a request and asserts only its status code.
 * Last Updated Date: October 1, 2026
 * @function checkStatus
 * @param {string} label - What the check is called
 * @param {string} method - The HTTP verb
 * @param {string} path - The path, including any query string
 * @param {object} [body] - The JSON body
 * @param {number} expected - The status code expected
 * @param {object} [options] - { jar, auth, cookie }
 * @returns {Promise<{status: number, data: object|string}>} The status and body
 * @author Cesar
 */
const checkStatus = async (label, method, path, body, expected, options) => {
    const res = await req(method, path, body, options);
    check(label, res.status, expected);
    return res;
};

/**
 * DOCU: Generates an email no other run has used.
 * Last Updated Date: October 1, 2026
 * @function uniqueEmail
 * @param {string} [prefix] - A label for the generated address
 * @returns {string} The email address
 * @author Cesar
 */
const uniqueEmail = (prefix = 'user') =>
    `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@foxylist.test`;

/** A password that clears the app's own rules. */
const VALID_PASSWORD = 'secret123';

/**
 * DOCU: Registers an account and signs it in.
 * Last Updated Date: October 1, 2026
 * @function createAndSignIn
 * @param {string} [prefix] - A label for the generated email
 * @param {string} [jar] - The cookie jar to keep the session in
 * @returns {Promise<{email: string, password: string, id: string, jar: string}>} The session
 * @author Cesar
 */
const createAndSignIn = async (prefix = 'user', jar = DEFAULT_JAR) => {
    const email = uniqueEmail(prefix);
    const password = VALID_PASSWORD;

    await req(
        'POST',
        '/api/users/register',
        { firstName: 'Test', lastName: 'Person', email, password },
        { jar, auth: false }
    );

    const login = await req('POST', '/api/users/sign_in', { email, password }, { jar, auth: false });

    return { email, password, id: login.data?.user?._id, jar };
};

export {
    BASE,
    state,
    req,
    check,
    show,
    checkStatus,
    uniqueEmail,
    createAndSignIn,
    setCookie,
    clearCookie,
    VALID_PASSWORD,
};