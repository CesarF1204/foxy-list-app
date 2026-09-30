import { badRequest } from './errorHelper.js';
import {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    FIRST_PAGE,
} from '../constants/pagination.js';

/**
 * DOCU: Reads page and page size from a query string, with bounds.
 * Last Updated Date: October 1, 2026
 * @function parsePagination
 * @param {object} query - The Express query object
 * @returns {{page: number, pageSize: number, skip: number}} 1-based page numbers
 * @author Cesar
 */
const parsePagination = (query = {}) => {
    const rawPage = Number(query.page ?? FIRST_PAGE);
    const rawSize = Number(query.pageSize ?? DEFAULT_PAGE_SIZE);

    if (!Number.isInteger(rawPage) || rawPage < FIRST_PAGE) {
        throw badRequest(`Page must be a whole number of ${FIRST_PAGE} or more.`);
    }

    if (!Number.isInteger(rawSize) || rawSize < 1 || rawSize > MAX_PAGE_SIZE) {
        throw badRequest(`Page size must be a whole number between 1 and ${MAX_PAGE_SIZE}.`);
    }

    return {
        page: rawPage,
        pageSize: rawSize,
        skip: (rawPage - FIRST_PAGE) * rawSize,
    };
};

/**
 * DOCU: Escapes a search term so a Mongo regex cannot be injected through it.
 * Last Updated Date: October 1, 2026
 * @function escapeRegex
 * @param {string} term - The raw search term
 * @returns {string} The escaped term
 * @author Cesar
 */
const escapeRegex = (term) => String(term ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePagination, escapeRegex };