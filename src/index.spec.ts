import { spawn, ChildProcess, } from "child_process";
import path from "path";

import { act, renderHook, } from "@testing-library/react-hooks";

import { createStore as createVanilla, } from "zustand/vanilla";
import { create, } from "zustand";

import * as Y from "yjs";
import { WebsocketProvider, } from "y-websocket";

import yjs from ".";

describe("Yjs middleware", () =>
{
  it("Creates a useState function.", () =>
  {
    type Store =
    {
      count: number,
      increment: () => void,
    };

    const { getState, } =
      createVanilla<Store>(yjs(
        new Y.Doc(),
        "hello",
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));

    expect(getState().count).toBe(0);

    getState().increment();

    expect(getState().count).toBe(1);
  });

  it("Receives changes from peers.", () =>
  {
    type Store =
    {
      count: number,
      increment: () => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });
    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const storeName = "store";

    const { "getState": getStateA, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));

    const { "getState": getStateB, } =
      createVanilla<Store>(yjs(
        doc2,
        storeName,
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));

    expect(getStateA().count).toBe(0);
    expect(getStateB().count).toBe(0);

    getStateA().increment();

    expect(getStateA().count).toBe(1);
    expect(getStateB().count).toBe(1);
  });

  it("Performs nested updates.", () =>
  {
    type Store =
    {
      person: {
        age: number,
      },
      getOlder: () => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });
    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const storeName = "store";

    const { "getState": getStateA, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "person": {
              "age": 0,
              "name": "Joe",
            },
            "getOlder": () =>
              set((state) =>
                ({
                  "person": { ...state.person, "age": state.person.age + 1, },
                })),
          })
      ));

    const { "getState": getStateB, } =
      createVanilla<Store>(yjs(
        doc2,
        storeName,
        (set) =>
          ({
            "person": {
              "age": 0,
              "name": "Joe",
            },
            "getOlder": () =>
              set((state) =>
                ({
                  "person": { ...state.person, "age": state.person.age + 1, },
                })),
          })
      ));

    expect(getStateA().person.age).toBe(0);
    expect(getStateB().person.age).toBe(0);

    getStateA().getOlder();

    expect(getStateA().person.age).toBe(1);
    expect(getStateB().person.age).toBe(1);
  });

  it("Performs deep nested updates.", () =>
  {
    type Store =
    {
      owner: {
        person: {
          age: number,
          name: string,
        },
      },
      getOlder: () => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });
    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const storeName = "store";

    const { "getState": getStateA, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "owner": {
              "person": {
                "age": 0,
                "name": "Joe",
              },
            },
            "getOlder": () =>
              set((state) =>
                ({
                  "owner": {
                    ...state.owner,
                    "person": {
                      ...state.owner.person,
                      "age": state.owner.person.age + 1,
                    },
                  },
                })),
          })
      ));
    const { "getState": getStateB, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "owner": {
              "person": {
                "age": 0,
                "name": "Joe",
              },
            },
            "getOlder": () =>
              set((state) =>
                ({
                  "owner": {
                    ...state.owner,
                    "person": {
                      ...state.owner.person,
                      "age": state.owner.person.age + 1,
                    },
                  },
                })),
          })
      ));

    expect(getStateA().owner.person.age).toBe(0);
    expect(getStateB().owner.person.age).toBe(0);

    getStateA().getOlder();

    expect(getStateA().owner.person.age).toBe(1);
    expect(getStateB().owner.person.age).toBe(1);
  });

  it("Updates arrays in objects.", () =>
  {
    type Store =
    {
      room: {
        users: string[]
      },
      join: (user: string) => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });
    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const storeName = "store";

    const { "getState": getStateA, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "room": {
              "users": [
                "amy",
                "sam",
                "harold"
              ],
            },
            "join": (user) =>
              set((state) =>
                ({
                  "room": {
                    ...state.room,
                    "users": [
                      ...state.room.users,
                      user
                    ],
                  },
                })),
          })
      ));

    const { "getState": getStateB, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "room": {
              "users": [
                "amy",
                "sam",
                "harold"
              ],
            },
            "join": (user) =>
              set((state) =>
                ({
                  "room": {
                    ...state.room,
                    "users": [
                      ...state.room.users,
                      user
                    ],
                  },
                })),
          })
      ));

    expect(getStateA().room.users).toEqual([ "amy", "sam", "harold" ]);
    expect(getStateB().room.users).toEqual([ "amy", "sam", "harold" ]);

    getStateA().join("bob");

    expect(getStateA().room.users).toEqual([ "amy", "sam", "harold", "bob" ]);
    expect(getStateB().room.users).toEqual([ "amy", "sam", "harold", "bob" ]);
  });

  it("Updates objects in arrays.", () =>
  {
    type Store =
    {
      users: { name: string, status: "online" | "offline" }[],
      setStatus: (userName: string, status: "online" | "offline") => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });
    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const storeName = "store";

    const { "getState": getStateA, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "users": [
              {
                "name": "alice",
                "status": "offline",
              },
              {
                "name": "bob",
                "status": "offline",
              }
            ],
            "setStatus": (userName, status) =>
            {
              set((state) =>
                ({
                  ...state,
                  "users": [
                    ...state.users.filter(({ name, }) =>
                      name !== userName),
                    {
                      "name": userName,
                      "status": status,
                    }
                  ],
                }));
            },
          })
      ));

    const { "getState": getStateB, } =
      createVanilla<Store>(yjs(
        doc1,
        storeName,
        (set) =>
          ({
            "users": [
              {
                "name": "alice",
                "status": "offline",
              },
              {
                "name": "bob",
                "status": "offline",
              }
            ],
            "setStatus": (userName, status) =>
            {
              set((state) =>
                ({
                  ...state,
                  "users": [
                    ...state.users.filter(({ name, }) =>
                      name !== userName),
                    {
                      "name": userName,
                      "status": status,
                    }
                  ],
                }));
            },
          })
      ));

    expect(getStateA().users).toEqual([
      { "name": "alice", "status": "offline", },
      { "name": "bob", "status": "offline", }
    ]);
    expect(getStateB().users).toEqual([
      { "name": "alice", "status": "offline", },
      { "name": "bob", "status": "offline", }
    ]);

    getStateA().setStatus("bob", "online");

    expect(getStateA().users).toEqual([
      { "name": "alice", "status": "offline", },
      { "name": "bob", "status": "online", }
    ]);
    expect(getStateA().users).toEqual([
      { "name": "alice", "status": "offline", },
      { "name": "bob", "status": "online", }
    ]);
  });

  describe("When adding consecutive entries into arrays", () =>
  {
    it("Does not throw when inserting multiple scalars into arrays.", () =>
    {
      type Store =
      {
        numbers: number[],
        addNumber: (n: number) => void,
      };

      const doc = new Y.Doc();

      const api =
        createVanilla<Store>(yjs(
          doc,
          "hello",
          (set) =>
            ({
              "numbers": [],
              "addNumber": (n) =>
                set((state) =>
                  ({
                    "numbers": [
                      ...state.numbers,
                      n
                    ],
                  })),
            })
        ));

      expect(api.getState().numbers).toEqual([]);

      expect(() =>
      {
        api.getState().addNumber(0);
        api.getState().addNumber(1);
      }).not.toThrow();
    });

    it("Does not throw when inserting multiple arrays into arrays.", () =>
    {
      type Store =
      {
        arrays: Array<any>[],
        addArray: (array: any[]) => void,
      };

      const doc = new Y.Doc();

      const api =
        createVanilla<Store>(yjs(
          doc,
          "hello",
          (set) =>
            ({
              "arrays": [],
              "addArray": (array) =>
                set((state) =>
                  ({
                    "arrays": [
                      ...state.arrays,
                      array
                    ],
                  })),
            })
        ));

      expect(api.getState().arrays).toEqual([]);

      expect(() =>
      {
        api.getState().addArray([ 1, 2, 3, 4 ]);
        api.getState().addArray([ "foo", "bar", "baz" ]);
      }).not.toThrow();
    });

    it("Does not throw when inserting multiple maps into arrays.", () =>
    {
      type Store =
      {
        users: { name: string, status: "online" | "offline" }[],
        addUser: (name: string, status: "online" | "offline") => void,
      };

      const doc = new Y.Doc();

      const api =
        createVanilla<Store>(yjs(
          doc,
          "hello",
          (set) =>
            ({
              "users": <{ name: string, status: "online" | "offline" }[]>[],
              "addUser": (name, status) =>
                set((state) =>
                  ({
                    "users": [
                      ...state.users,
                      {
                        "name": name,
                        "status": status,
                      }
                    ],
                  })),
            })
        ));

      expect(api.getState().users).toEqual([]);

      expect(() =>
      {
        api.getState().addUser("alice", "offline");
        api.getState().addUser("bob", "offline");
      }).not.toThrow();
    });
  });

  // See issue #42
  describe("When unsetting contents of an object", () =>
  {
    it("Does not crash on subsequent update", () =>
    {
      type Store =
      {
        count: number,
        columns: Record<string, any>[],

        increment: () => void,
        setColumns: (object: Record<string, any>) => void,
        removeColumns: () => void,
      };

      const doc = new Y.Doc();

      const api =
        createVanilla<Store>(yjs(
          doc,
          "hello",
          (set) =>
            ({
              "count": 0,
              "columns": [],
              "increment": () =>
                set((state) =>
                  ({
                    ...state,
                    "count": state.count + 1,
                  })),
              "setColumns": (object: Record<string, any>) =>
                set({
                  "columns": [ { "dataObject": [ object ], } ],
                }),
              "removeColumns": () =>
                set({
                  "columns": [ { "dataObject": undefined, } ],
                }),
            })
        ));

      expect(() =>
      {
        api.getState().setColumns({ "foo": "bar", });
        api.getState().removeColumns();
        api.getState().increment();
      }).not.toThrow();
    });
  });

  // See issue #49
  describe("When nesting strings into arrays and objects", () =>
  {
    it("Does not crash", () =>
    {
      type Store =
      {
        foo: { bar: string }
        updateFoo: (s: string) => void
      };

      const doc = new Y.Doc();

      const api = createVanilla<Store>(yjs(
        doc,
        "hello",
        (set) =>
          ({
            "foo": {
              "bar": "baz",
            },
            "updateFoo": (s: string) =>
              set((state) =>
                ({ ...state, "foo": { "bar": s, }, })),
          })
      ));

      expect(() =>
      {
        api.getState().updateFoo("bingo");
        api.getState().updateFoo("bango"); // Always on subsequent update
      }).not.toThrow();
    });
  });

  it("Stores strings as Y.Text and merges concurrent edits", () =>
  {
    type Store = { text: string };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    let connected = false;
    doc1.on("update", (u: Uint8Array) => { if (connected) Y.applyUpdate(doc2, u); });
    doc2.on("update", (u: Uint8Array) => { if (connected) Y.applyUpdate(doc1, u); });

    const store1 = createVanilla<Store>(yjs(doc1, "store", () => ({ "text": "hello", })));
    const store2 = createVanilla<Store>(yjs(doc2, "store", () => ({ "text": "hello", })));

    // Write initial state into the Y.Doc and sync both peers to the same Y.Text object.
    connected = true;
    store1.setState({ "text": "hello", });

    const sv1 = Y.encodeStateVector(doc1);
    const sv2 = Y.encodeStateVector(doc2);

    // Verify that the string is stored as Y.Text, not a raw value.
    expect(doc1.getMap("store").get("text")).toBeInstanceOf(Y.Text);

    connected = false;

    // Concurrent edits at non-overlapping positions.
    store1.setState({ "text": "START hello", });
    store2.setState({ "text": "hello END", });

    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1, sv2));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2, sv1));

    // Both edits should survive the Y.Text CRDT merge.
    expect(store1.getState().text).toContain("START");
    expect(store1.getState().text).toContain("END");
    expect(store2.getState().text).toBe(store1.getState().text);
  });

  it("Stores atomic fields as raw values and merges Y.Text fields on concurrent edits", () =>
  {
    /**
     * `atomic` is declared atomic via the path predicate, so it is stored as a
     * plain value in the Y.Map (last-write-wins on concurrent update).
     * `text` is a regular string, so it is stored as Y.Text (CRDT merge).
     */
    type Store =
    {
      atomic: string,
      text: string,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const storeName = "store";

    // `atomic` at the root level is treated as an atomic value (no Y.Text / Y.Map).
    const isAtomic = (path: string[]) => path.join(".") === "atomic";

    // Docs are connected initially so that the first setState (which writes the
    // shared initial state into the Y.Doc) propagates to both peers. This ensures
    // both docs hold the *same* Y.Text object for "text" before we fork — a
    // prerequisite for Y.Text CRDT merging to work on concurrent edits.
    let connected = false;
    doc1.on("update", (u: Uint8Array) => { if (connected) Y.applyUpdate(doc2, u); });
    doc2.on("update", (u: Uint8Array) => { if (connected) Y.applyUpdate(doc1, u); });

    const store1 = createVanilla<Store>(yjs(
      doc1,
      storeName,
      () => ({ "atomic": "initial", "text": "hello", }),
      { isAtomic }
    ));

    const store2 = createVanilla<Store>(yjs(
      doc2,
      storeName,
      () => ({ "atomic": "initial", "text": "hello", }),
      { isAtomic }
    ));

    // Write the initial state into the Y.Doc while connected so that both docs
    // receive the same Y.Text object for "text".
    connected = true;
    store1.setState({ "atomic": "initial", "text": "hello", });

    expect(store1.getState().atomic).toBe("initial");
    expect(store2.getState().atomic).toBe("initial");
    expect(store1.getState().text).toBe("hello");
    expect(store2.getState().text).toBe("hello");

    // Capture state vectors at the fork point so we can exchange only the
    // diverged updates later.
    const sv1 = Y.encodeStateVector(doc1);
    const sv2 = Y.encodeStateVector(doc2);

    // --- Fork: disconnect so each doc accumulates its own updates independently ---
    connected = false;

    // Doc1 prepends to text, doc2 appends — edits at different positions so
    // both survive the Y.Text CRDT merge.
    store1.setState({ "atomic": "from-peer-1", "text": "START hello", });
    store2.setState({ "atomic": "from-peer-2", "text": "hello END", });

    // Exchange only the updates that occurred after the fork.
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1, sv2));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2, sv1));

    // text: both edits should be present after merge.
    expect(store1.getState().text).toContain("START");
    expect(store1.getState().text).toContain("END");

    // atomic: exactly one peer's value wins — no concatenation or partial merge.
    const atomicResult = store1.getState().atomic;
    expect([ "from-peer-1", "from-peer-2" ]).toContain(atomicResult);
    expect(atomicResult).not.toContain("from-peer-1from-peer-2");
    expect(atomicResult).not.toContain("from-peer-2from-peer-1");

    // Both peers converge to the same state.
    expect(store2.getState().text).toBe(store1.getState().text);
    expect(store2.getState().atomic).toBe(store1.getState().atomic);

    // check exact type
    expect(doc1.getMap("store").get("text")).toBeInstanceOf(Y.Text);
    expect(typeof doc1.getMap("store").get("atomic")).toEqual('string');
  });
});

describe("Yjs middleware with network provider", () =>
{
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let server: ChildProcess;
  const port = 1234;

  const waitForProviderToConnect = async (provider: WebsocketProvider) =>
    new Promise<void>((resolve) =>
    {
      (function waitForFoo()
      {
        if (provider.wsconnected) return resolve();
        setTimeout(waitForFoo, 30);
      })();
    });


  // Startup y-websocket demo server for test.
  beforeEach(async () =>
  {
    server = spawn(
      "node",
      [ "./node_modules/y-websocket/bin/server.js" ],
      {
        "cwd": path.resolve(__dirname, ".."),
        "windowsHide": true,
        "env": {
          ...process.env,
          "HOST": "localhost",
          "PORT": port.toString(),
        },
      }
    );

    // Wait for the server to be ready before running the tests.
    await new Promise<void>((resolve) =>
    {
      server.stdout?.on("readable", () =>
      {
        server.stdout?.removeAllListeners();
        resolve();
      });
    });
  });

  // Kill y-websocket demo server after test has completed.
  afterEach(() =>
  {
    server.kill();
  });

  it("Does not reset state on second join.", async () =>
  {
    const address = `ws://localhost:${port}`;
    const roomName = "room";
    const mapName = "shared";

    type State =
    {
      count: number,
      increment: () => void,
    };

    const doc1 = new Y.Doc();
    const provider1 = new WebsocketProvider(
      address,
      roomName,
      doc1,
      {
        "WebSocketPolyfill": require("ws"),
      }
    );
    const store1 = createVanilla<State>(yjs(
      doc1,
      mapName,
      (set) =>
        ({
          "count": 0,
          "increment": () =>
            set((state) =>
              ({ "count": state.count + 1, })),
        })
    ));

    await waitForProviderToConnect(provider1);

    store1.getState().increment();

    expect(store1.getState().count).toBe(1);

    const doc2 = new Y.Doc();
    const provider2 = new WebsocketProvider(
      address,
      roomName,
      doc2,
      {
        "WebSocketPolyfill": require("ws"),
      }
    );
    const store2 = createVanilla<State>(yjs(
      doc2,
      mapName,
      (set) =>
        ({
          "count": 0,
          "increment": () =>
            set((state) =>
              ({ "count": state.count + 1, })),
        })
    ));

    await waitForProviderToConnect(provider2);

    expect(store1.getState().count).toBe(1);
    expect(store2.getState().count).toBe(1);

    store1.getState().increment();

    expect(store1.getState().count).toBe(2);
    expect(store2.getState().count).toBe(2);

    provider1.awareness.destroy();
    provider1.destroy();
    provider2.awareness.destroy();
    provider2.destroy();
  });
});

describe("Yjs middleware in React", () =>
{
  /**
   * See Issue 37.
   */
  it("Functions in nested objects are not converted to plain objects.", () =>
  {
    type Store =
    {
      count: number,
      increment: () => void,
      someOtherData: any,
    };

    const doc = new Y.Doc();

    const useStore =
      create<Store>(yjs(
        doc,
        "hello",
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
            "someOtherData": {
              "foo": () =>
                "bar",
            },
          })
      ));

    const { result, } = renderHook(() =>
      useStore(({ count, increment, someOtherData, }) =>
        ({
          "count": count,
          "increment": increment,
          "someOtherData": someOtherData,
        })));

    act(() =>
    {
      result.current.increment();
    });

    expect(typeof result.current.someOtherData.foo).toBe("function");
  });

  /**
   * See Issue 41.
   */
  it("Zustand is properly notified of updates from remote peer.", () =>
  {
    type Store =
    {
      count: number,
      increment: () => void,
    };

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on("update", (update: any) =>
    {
      Y.applyUpdate(doc2, update);
    });

    doc2.on("update", (update: any) =>
    {
      Y.applyUpdate(doc1, update);
    });

    const useStore1 =
      create<Store>(yjs(
        doc1,
        "hello",
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));


    const useStore2 =
      create<Store>(yjs(
        doc2,
        "hello",
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));

    const { "result": result1, } = renderHook(() =>
      useStore1(({ count, increment, }) =>
        ({
          "count": count,
          "increment": increment,
        })));

    const { "result": result2, } = renderHook(() =>
      useStore2(({ count, increment, }) =>
        ({
          "count": count,
          "increment": increment,
        })));

    act(() =>
    {
      result1.current.increment();
    });

    expect(doc2.getMap("hello").get("count")).toBe(1); // Sanity check
    expect(result2.current.count).toBe(1); // Actual issue
  });

  it("Updates ydoc on setState calls.", () =>
  {
    type Store =
    {
      count: number,
      increment: () => void,
    };

    const doc = new Y.Doc();

    const updateSpy = jest.fn();
    doc.on("update", updateSpy);

    const store =
      createVanilla<Store>(yjs(
        doc,
        "store",
        (set) =>
          ({
            "count": 0,
            "increment": () =>
              set((state) =>
                ({ "count": state.count + 1, })),
          })
      ));

    const storeUpdateSpy = jest.fn();
    store.subscribe(storeUpdateSpy);

    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(storeUpdateSpy).toHaveBeenCalledTimes(0);
    store.setState((state) =>
      ({ "count": state.count + 1, }));
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(storeUpdateSpy).toHaveBeenCalledTimes(1);
  });
});
