import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import ApiDocumentation from "../src/components/ApiDocumentation/ApiDocumentation";
import ApiEndpoint from "../src/components/ApiDocumentation/ApiEndpoint";
import { ApiDocumentation as BarrelApiDocumentation } from "../src/components/ApiDocumentation";
import ApiDocs from "../src/pages/ApiDocs";
import { AppContextProvider } from "../src/contexts/AppContext";
import { groupOperationsByTag, readSpecSummary } from "../src/helpers/openapiHelper";
import { ROUTES } from "../src/constants/routes";
import { SPEC, EMPTY_SPEC, UNKNOWN_SPEC } from "./apiDocsFixture";

/**
 * The backend is stubbed, so each test decides what the server's specification says. The
 * viewer is meant to render whatever document it is handed, and these tests are what prove
 * it: the fixture is deliberately unlike the real Foxy List document.
 */
const getOpenApiSpec = vi.fn();
vi.mock("../src/api-client/docs", async () => {
    const actual = await vi.importActual("../src/api-client/docs");

    return { ...actual, getOpenApiSpec: (...args) => getOpenApiSpec(...args) };
});

/** A client with retries off, so a rejected request does not outlive a test's timeout. */
const makeClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

const renderViewer = () =>
    render(
        <QueryClientProvider client={makeClient()}>
            <ApiDocumentation />
        </QueryClientProvider>
    );

/**
 * The row button for one endpoint, found by its method and path together. The path's `/`,
 * `{` and `}` are wildcards in a regular expression, so they are replaced with `.` to keep
 * the match literal enough to identify one row out of several.
 */
const rowFor = (method, path) =>
    screen.getByRole("button", { name: new RegExp(`${method}.*${path.replace(/[/{}]/g, ".")}`) });

/** Renders, waits for the document, then opens one endpoint. */
const openEndpoint = async (method, path) => {
    renderViewer();
    await screen.findByRole("heading", { name: "Widgets" });

    fireEvent.click(rowFor(method, path));
};

beforeEach(() => {
    getOpenApiSpec.mockResolvedValue(SPEC);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("the viewer's loading and failure states", () => {
    it("says it is loading before the document arrives", () => {
        getOpenApiSpec.mockReturnValue(new Promise(() => {}));

        renderViewer();

        expect(screen.getByRole("status")).toHaveTextContent("Loading the API documentation");
    });

    it("explains a failure and offers a retry, rather than rendering an empty page", async () => {
        getOpenApiSpec.mockRejectedValue(new Error("Unable to reach the server."));

        renderViewer();

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Could not load the API documentation");
        expect(alert).toHaveTextContent("Unable to reach the server.");
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("asks the backend again when the retry is pressed", async () => {
        /** Rejected outright rather than once: the query asks for one retry of its own. */
        getOpenApiSpec.mockRejectedValue(new Error("down"));

        renderViewer();
        await screen.findByRole("alert");

        getOpenApiSpec.mockResolvedValue(SPEC);
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        await screen.findByRole("heading", { name: "Widgets" });
        expect(getOpenApiSpec).toHaveBeenCalledTimes(3);
    });

    it("survives a document with no paths at all", async () => {
        getOpenApiSpec.mockResolvedValue(EMPTY_SPEC);

        renderViewer();

        expect(await screen.findByText("No endpoints documented")).toBeInTheDocument();
    });
});

describe("the endpoint list", () => {
    it("renders every documented endpoint, grouped under the document's own tags", async () => {
        renderViewer();

        await screen.findByRole("heading", { name: "Widgets" });

        const widgets = screen.getByRole("heading", { name: "Widgets" }).closest("section");

        /** Two rows carry this path - the GET and the POST - and one carries the id form. */
        expect(within(widgets).getAllByText("/api/widgets")).toHaveLength(2);
        expect(within(widgets).getByText("/api/widgets/{id}")).toBeInTheDocument();

        const health = screen.getByRole("heading", { name: "Health" }).closest("section");
        expect(within(health).getByText("/health")).toBeInTheDocument();
    });

    it("keeps the path as documented, template and all", async () => {
        renderViewer();

        expect(await screen.findByText("/api/widgets/{id}")).toBeInTheDocument();
    });

    it("shows a summary line on each row", async () => {
        renderViewer();

        expect(await screen.findByText("List widgets")).toBeInTheDocument();
    });

    /**
     * The whole point of the page: nothing is hardcoded. These endpoints appear because the
     * document declares them, and a document declaring none of them would render none.
     */
    it("renders endpoints the component has never heard of", async () => {
        getOpenApiSpec.mockResolvedValue(UNKNOWN_SPEC);

        renderViewer();

        expect(await screen.findByRole("heading", { name: "Sprockets" })).toBeInTheDocument();
        expect(screen.getByText("/api/sprockets/{code}")).toBeInTheDocument();
        expect(screen.getByText("Reflate a sprocket")).toBeInTheDocument();
    });

    it("distinguishes the methods by name, not only by colour", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        /**
         * Scoped by the badge's own text, which is what a screen reader announces and what
         * the row still communicates with no colour at all. Two GETs because the fixture has
         * a list and a probe.
         */
        expect(screen.getAllByText("GET")).toHaveLength(2);
        expect(screen.getByText("POST")).toBeInTheDocument();
        expect(screen.getByText("DELETE")).toBeInTheDocument();
    });

    it("filters by term and keeps a group only while something in it matches", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.change(screen.getByLabelText("Filter endpoints"), {
            target: { value: "delete" },
        });

        /** The timeout covers the debounce: the list filters once typing pauses. */
        await waitFor(
            () =>
                expect(screen.queryByRole("heading", { name: "Health" })).not.toBeInTheDocument(),
            { timeout: 2000 },
        );
        expect(screen.getByText("/api/widgets/{id}")).toBeInTheDocument();
        expect(screen.queryByText("/health")).not.toBeInTheDocument();
    });

    it("says so when a filter matches nothing, rather than showing an empty page", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.change(screen.getByLabelText("Filter endpoints"), {
            target: { value: "nothing matches this" },
        });

        /** The timeout covers the debounce: the empty state appears once typing pauses. */
        expect(
            await screen.findByText("Nothing matches that filter", undefined, { timeout: 2000 }),
        ).toBeInTheDocument();
    });

    it("keeps the box responsive while the list waits, then filters once typing stops", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        /** Typed the way a person types it: one character after another, no pause between. */
        for (const letter of "health") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /** The box holds the word immediately, but the list has not been re-filtered yet. */
        expect(box).toHaveValue("health");
        expect(screen.getByRole("heading", { name: "Widgets" })).toBeInTheDocument();

        /** Typing stops and the debounce elapses: the list catches up with the box. */
        await waitFor(
            () =>
                expect(screen.queryByRole("heading", { name: "Widgets" })).not.toBeInTheDocument(),
            { timeout: 2000 },
        );
        expect(screen.getByText("/health")).toBeInTheDocument();
    });

    it("filters on the whole word rather than every intermediate prefix", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        for (const letter of "dele") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /**
         * "d" and "de" match nothing on their own, but "dele" matches the delete endpoint.
         * Filtering per keystroke would empty the list twice on the way there.
         */
        await waitFor(() => expect(screen.getByText("/api/widgets/{id}")).toBeInTheDocument(), {
            timeout: 2000,
        });
    });

    it("points at the specification and the Swagger UI it was generated from", async () => {
        renderViewer();

        /** One address each, so either can be copied out of the page whole. */
        expect(await screen.findByText(/\/openapi\.json$/)).toBeInTheDocument();
        expect(screen.getByText(/\/api-docs$/)).toBeInTheDocument();
    });
});

describe("the search box while a search is being worked out", () => {
    it("is not searching when nothing has been typed", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        expect(screen.getByLabelText("Filter endpoints")).toHaveAttribute("aria-busy", "false");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows the ring inside the box the moment a term is typed, before the list changes", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        fireEvent.change(box, { target: { value: "health" } });

        /** The list has not been re-filtered yet - the debounce is still running. */
        expect(screen.getByRole("heading", { name: "Widgets" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Searching the documentation");
        expect(box).toHaveAttribute("aria-busy", "true");
    });

    it("takes the ring away once the term has settled", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        fireEvent.change(box, { target: { value: "health" } });
        expect(screen.getByRole("status")).toBeInTheDocument();

        /** The timeout covers the debounce: the box settles when the list does. */
        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument(), {
            timeout: 2000,
        });
        expect(screen.getByText("/health")).toBeInTheDocument();
        expect(box).toHaveAttribute("aria-busy", "false");
    });

    it("spins on every keystroke, so a word typed fast is never shown unannounced", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        /** Typed the way a person types it: no pause, so the debounce never lands mid-word. */
        for (const letter of "health") {
            fireEvent.change(box, { target: { value: box.value + letter } });
            expect(screen.getByRole("status")).toBeInTheDocument();
        }

        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument(), {
            timeout: 2000,
        });
    });

    it("uses the app's own ring, at field size, inside the field's own box", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        fireEvent.change(box, { target: { value: "health" } });

        /** The same colours and classes every other loader in the product uses. */
        const ring = document.querySelector(".animate-spin");
        expect(ring).toHaveClass("rounded-full");
        expect(ring).toHaveClass("border-fox-200");
        expect(ring).toHaveClass("border-t-fox-500");
        expect(ring).toHaveClass("h-4", "w-4");

        /** Decorative: the words beside it are what a screen reader announces. */
        expect(ring).toHaveAttribute("aria-hidden", "true");

        /**
         * Positioned against the field rather than laid out after it, so the ring cannot be
         * pushed onto its own line on a narrow screen, and it cannot steal the click that
         * puts the caret in the box.
         */
        const holder = ring.closest('[role="status"]');
        expect(holder).toHaveClass("absolute");
        expect(holder).toHaveClass("pointer-events-none");
        expect(holder.parentElement).toHaveClass("relative");
        expect(holder.parentElement.contains(box)).toBe(true);

        /** Room kept on the right for the ring, so a long term is not written under it. */
        expect(box).toHaveClass("pr-11!");
    });

    it("leaves the box typeable while it spins", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });
        const box = screen.getByLabelText("Filter endpoints");

        fireEvent.change(box, { target: { value: "health" } });
        fireEvent.change(box, { target: { value: box.value + "y" } });

        expect(box).toHaveValue("healthy");
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("spins while the document is being refetched, and stops when it lands", async () => {
        /** A refetch that stays in flight until the test releases it. */
        let release;
        getOpenApiSpec.mockResolvedValueOnce(SPEC);
        getOpenApiSpec.mockImplementationOnce(
            () => new Promise((resolve) => { release = resolve; }),
        );

        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(screen.getByRole("button", { name: "Reload spec" }));

        /** The refetch is a round trip, so the wait covers it landing in the query. */
        expect(
            await screen.findByRole("status", undefined, { timeout: 2000 }),
        ).toHaveTextContent("Searching the documentation");

        await act(async () => { release(SPEC); });
        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
        expect(screen.getByText("/api/widgets/{id}")).toBeInTheDocument();
    });
});

describe("an expanded endpoint", () => {
    it("is collapsed until asked, and the toggle says which it is", async () => {
        renderViewer();
        const row = await waitFor(() => rowFor("GET", "/api/widgets"));

        expect(row).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
    });

    it("reveals its detail on click and hides it again", async () => {
        await openEndpoint("GET", "/api/widgets");

        expect(await screen.findByText("Authentication")).toBeInTheDocument();

        fireEvent.click(rowFor("GET", "/api/widgets"));
        await waitFor(() =>
            expect(screen.queryByText("Authentication")).not.toBeInTheDocument()
        );
    });

    it("states that a guarded endpoint needs a session", async () => {
        await openEndpoint("GET", "/api/widgets");

        expect(await screen.findByText(/Requires a signed-in session/)).toBeInTheDocument();
    });

    it("states that a public endpoint needs nothing", async () => {
        await openEndpoint("POST", "/api/widgets");

        expect(await screen.findByText(/Public\. No session is needed/)).toBeInTheDocument();
    });

    it("lists its parameters, and says where each one goes", async () => {
        await openEndpoint("DELETE", "/api/widgets/");

        const panel = (await screen.findByText("Parameters")).closest("section");

        expect(within(panel).getByText("id")).toBeInTheDocument();
        expect(within(panel).getByText("path")).toBeInTheDocument();
        expect(within(panel).getByText("required")).toBeInTheDocument();
    });

    it("explains an id pattern instead of printing it", async () => {
        await openEndpoint("DELETE", "/api/widgets/");

        expect(await screen.findByText(/24 character ObjectId/)).toBeInTheDocument();
        expect(screen.queryByText(/a-fA-F/)).not.toBeInTheDocument();
    });

    it("lists a request body's fields, through the $ref that names it", async () => {
        await openEndpoint("POST", "/api/widgets");

        const panel = (await screen.findByText("Request body")).closest("section");

        expect(within(panel).getByText("name")).toBeInTheDocument();
        expect(within(panel).getByText("What it is called.")).toBeInTheDocument();
        expect(within(panel).getByText("required")).toBeInTheDocument();
    });

    it("lists every response with its status code and the schema it returns", async () => {
        await openEndpoint("GET", "/api/widgets");

        const panel = (await screen.findByText("Responses")).closest("section");

        expect(within(panel).getByText("200")).toBeInTheDocument();
        expect(within(panel).getByText("The widgets.")).toBeInTheDocument();
        expect(within(panel).getByText("WidgetList")).toBeInTheDocument();
        expect(within(panel).getByText("401")).toBeInTheDocument();
    });
});

/**
 * One at a time.
 *
 * The rows are siblings in one list, so "one open" is a claim about the whole list rather than
 * about each row. These open two in turn and assert the first one closed, which is the whole
 * requirement; the `aria-expanded` assertions are there because a panel that hides by CSS alone
 * would pass a visual check while still being in the accessibility tree.
 */
describe("the endpoints open one at a time", () => {
    it("closes the previously open endpoint when another is opened", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(rowFor("GET", "/api/widgets"));
        expect(await screen.findByText("The widgets.")).toBeInTheDocument();

        /** A second row, in the same group, so nothing about ordering is doing the work. */
        fireEvent.click(rowFor("POST", "/api/widgets"));

        await waitFor(() => expect(screen.queryByText("The widgets.")).not.toBeInTheDocument());
        expect(await screen.findByText("What it is called.")).toBeInTheDocument();
    });

    it("leaves exactly one panel mounted, never two", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(rowFor("GET", "/api/widgets"));
        fireEvent.click(rowFor("POST", "/api/widgets"));

        await waitFor(() =>
            expect(screen.getByText("What it is called.")).toBeInTheDocument()
        );

        /**
         * Counted rather than asserted absent-and-present, because every panel carries the same
         * "Authentication" heading - one panel and two open rows would both show it, and only
         * the count tells them apart.
         */
        expect(screen.getAllByText("Authentication")).toHaveLength(1);
    });

    it("closes a row in another group too, not just one beside it", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(rowFor("GET", "/api/widgets"));
        expect(await screen.findByText("The widgets.")).toBeInTheDocument();

        /** `/health` sits under its own tag, so this crosses a group boundary. */
        fireEvent.click(rowFor("GET", "/health"));

        await waitFor(() => expect(screen.queryByText("The widgets.")).not.toBeInTheDocument());
        expect(await screen.findByText("Up.")).toBeInTheDocument();
    });

    it("reports the open row to assistive technology as the expanded one", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        const list = rowFor("GET", "/api/widgets");
        const create = rowFor("POST", "/api/widgets");

        fireEvent.click(list);
        await waitFor(() => expect(list).toHaveAttribute("aria-expanded", "true"));
        expect(create).toHaveAttribute("aria-expanded", "false");

        /** The flag moves rather than accumulating, so only one row ever reads as expanded. */
        fireEvent.click(create);
        await waitFor(() => expect(create).toHaveAttribute("aria-expanded", "true"));
        expect(list).toHaveAttribute("aria-expanded", "false");
    });

    it("still closes on a second click of the same row, rather than sticking open", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(rowFor("GET", "/api/widgets"));
        expect(await screen.findByText("The widgets.")).toBeInTheDocument();

        fireEvent.click(rowFor("GET", "/api/widgets"));

        await waitFor(() => expect(screen.queryByText("The widgets.")).not.toBeInTheDocument());
        expect(rowFor("GET", "/api/widgets")).toHaveAttribute("aria-expanded", "false");
    });

    it("leaves no detail mounted when a filter hides the open endpoint", async () => {
        renderViewer();
        await screen.findByRole("heading", { name: "Widgets" });

        fireEvent.click(rowFor("GET", "/api/widgets"));
        expect(await screen.findByText("The widgets.")).toBeInTheDocument();

        /** The row is gone from the list, so its detail must go with it. */
        fireEvent.change(screen.getByLabelText("Filter endpoints"), {
            target: { value: "/health" },
        });

        /** The timeout covers the debounce before the list actually re-filters. */
        await waitFor(
            () => expect(screen.queryByText("The widgets.")).not.toBeInTheDocument(),
            { timeout: 2000 },
        );
    });
});

/**
 * A row taken on its own from the barrel, with no viewer around it. It keeps its own open
 * state, because a screen adopting a single row should not have to adopt the viewer's state
 * machine to get a working disclosure.
 */
describe("a single endpoint row, used on its own", () => {
    const renderRow = (endpoint) =>
        render(
            <ul>
                <ApiEndpoint endpoint={endpoint} />
            </ul>
        );

    it("opens and closes itself, with no parent holding state", () => {
        const [widgets] = groupOperationsByTag(SPEC);
        renderRow(widgets.endpoints[0]);

        const row = screen.getByRole("button", { name: /GET.*\/api\/widgets/ });
        expect(row).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(row);
        expect(row).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByText("Authentication")).toBeInTheDocument();

        fireEvent.click(row);
        expect(row).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
    });
});

describe("the helper that reads the document", () => {
    it("resolves an allOf through its reference, rather than stopping at the wrapper", () => {
        const [widgets] = groupOperationsByTag(SPEC);
        const [list] = widgets.endpoints;

        /** The body of the list endpoint is `$ref: WidgetList`, and that is `allOf: [Widget]`. */
        expect(list.requestBody).toBeNull();

        const responseSchema = list.responses[0].schema;
        expect(responseSchema).toBe("WidgetList");
    });

    it("flattens a body declared through allOf into the fields it inherits", () => {
        const groups = groupOperationsByTag({
            paths: {
                "/x": {
                    post: {
                        tags: ["T"],
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/WidgetList" },
                                },
                            },
                        },
                        responses: {},
                    },
                },
            },
            components: {
                schemas: {
                    Widget: { type: "object", properties: { name: { type: "string" } } },
                    WidgetList: { allOf: [{ $ref: "#/components/schemas/Widget" }] },
                },
            },
        });

        const [body] = groups[0].endpoints[0].requestBody.fields;
        expect(body.name).toBe("name");
    });

    it("orders groups by the document's declared tags", () => {
        expect(groupOperationsByTag(SPEC).map((group) => group.name)).toEqual([
            "Widgets",
            "Health",
        ]);
    });

    it("puts an undeclared tag last rather than dropping it", () => {
        const groups = groupOperationsByTag({
            tags: [{ name: "Alpha" }],
            paths: {
                "/x": { get: { tags: ["Alpha"], responses: {} } },
                "/y": { get: { tags: ["Zebra"], responses: {} } },
            },
        });

        expect(groups.map((group) => group.name)).toEqual(["Alpha", "Zebra"]);
    });

    it("keeps an untagged operation visible", () => {
        const groups = groupOperationsByTag({
            paths: { "/x": { get: { summary: "x", responses: {} } } },
        });

        expect(groups[0].name).toBe("Untagged");
    });

    it("treats an operation with no security entry as guarded, since it inherits the default", () => {
        const groups = groupOperationsByTag({
            paths: { "/x": { get: { tags: ["T"], responses: {} } } },
        });

        expect(groups[0].endpoints[0].secured).toBe(true);
    });

    it("sorts responses numerically, so 200 comes before 404", () => {
        const [health] = groupOperationsByTag({
            paths: {
                "/x": {
                    get: {
                        tags: ["T"],
                        responses: { 404: { description: "gone" }, 200: { description: "ok" } },
                    },
                },
            },
        });

        expect(health.endpoints[0].responses.map((r) => r.status)).toEqual(["200", "404"]);
    });

    it("skips a path key that is not a verb, rather than rendering it as one", () => {
        const groups = groupOperationsByTag({
            paths: {
                "/x": {
                    summary: "A shared note, not an operation.",
                    parameters: [],
                    get: { tags: ["T"], summary: "The real one", responses: {} },
                },
            },
        });

        expect(groups[0].endpoints).toHaveLength(1);
        expect(groups[0].endpoints[0].summary).toBe("The real one");
    });

    it("counts the operations for the page header", () => {
        expect(readSpecSummary(SPEC)).toMatchObject({
            title: "Widget API",
            version: "2.1.0",
            endpointCount: 4,
        });
    });

    it("falls back rather than throwing on a document with no info block", () => {
        expect(readSpecSummary({}).title).toBe("API");
        expect(readSpecSummary(undefined).endpointCount).toBe(0);
    });
});

describe("the route it hangs on", () => {
    it("is the address the backend serves its documentation from, without a trailing slash", () => {
        expect(ROUTES.apiDocs).toBe("/api-docs");
    });
});

/**
 * The page, mounted rather than inspected.
 *
 * These exist because a page imports the viewer through the folder's barrel, and a barrel
 * that exports only by name turns a default import into a module-load failure - which no
 * test of the viewer alone would ever reach, because the viewer is imported by file there.
 * The failure only shows up when the page itself is loaded.
 */
describe("the page that mounts the viewer", () => {
    const renderPage = () =>
        render(
            <QueryClientProvider client={makeClient()}>
                <AppContextProvider>
                    <MemoryRouter initialEntries={[ROUTES.apiDocs]}>
                        <ApiDocs />
                    </MemoryRouter>
                </AppContextProvider>
            </QueryClientProvider>
        );

    it("gets the viewer from the barrel under the name the barrel exports", () => {
        expect(BarrelApiDocumentation).toBe(ApiDocumentation);
    });

    it("renders, rather than failing to load its imports", async () => {
        renderPage();

        expect(screen.getByRole("heading", { name: "API Documentation", level: 1 })).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole("heading", { name: "Widgets" })).toBeInTheDocument());
    });

    it("reaches the viewer without a session, and says so when the backend is down", async () => {
        getOpenApiSpec.mockRejectedValue(new Error("Unable to reach the server."));

        renderPage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load the API documentation"
        );
    });

    /**
     * The CRT, which is the one character on this page that is not the fox.
     *
     * Asserted by its accessible name rather than by its sprite: the sheets are two static
     * files the browser fetches, so the only thing the app itself decides is which character
     * it names and where it puts it. The name is also the part a screen reader announces,
     * which makes it the assertion worth having - a mascot rendered as an unlabelled
     * decoration would pass a snapshot and still fail the person using it.
     */
    it("has the CRT beside the heading, where a screen reader can find it", async () => {
        renderPage();
        await screen.findByRole("heading", { name: "Widgets" });

        const crt = screen.getByRole("button", { name: "Boop the CRT" });
        const heading = screen.getByRole("heading", { name: "API Documentation", level: 1 });

        /** In the page's own main landmark, alongside the heading rather than inside the viewer. */
        expect(crt.closest("main")).toBe(heading.closest("main"));
        expect(heading.compareDocumentPosition(crt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
