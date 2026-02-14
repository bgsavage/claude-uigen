import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

const mockRouter = {
  push: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    test("handles successful sign in with existing projects", async () => {
      const mockProjects = [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
      ];

      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        await signInPromise;
      });

      expect(actions.signIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(anonTracker.getAnonWorkData).toHaveBeenCalled();
      expect(getProjectsAction.getProjects).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/project-1");
      expect(result.current.isLoading).toBe(false);
    });

    test("handles successful sign in with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "test" } },
      };
      const mockProject = { id: "new-project", name: "Design from 10:30:00 AM" };

      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProjectAction.createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      await act(async () => {
        await signInPromise;
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/new-project");
    });

    test("handles successful sign in with no projects", async () => {
      const mockProject = { id: "new-project", name: "New Design #12345" };

      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      await act(async () => {
        await signInPromise;
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/new-project");
    });

    test("handles failed sign in", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };

      vi.mocked(actions.signIn).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrong");
      });

      expect(signInResult).toEqual(errorResult);
      expect(anonTracker.getAnonWorkData).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    test("resets loading state on error", async () => {
      vi.mocked(actions.signIn).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("handles successful sign up with existing projects", async () => {
      const mockProjects = [{ id: "project-1", name: "Project 1" }];

      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        await signUpPromise;
      });

      expect(actions.signUp).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockRouter.push).toHaveBeenCalledWith("/project-1");
      expect(result.current.isLoading).toBe(false);
    });

    test("handles successful sign up with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Create a button" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "button code" } },
      };
      const mockProject = { id: "anon-project", name: "Design from 2:45:00 PM" };

      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProjectAction.createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "password123");
      });

      await act(async () => {
        await signUpPromise;
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/anon-project");
    });

    test("handles successful sign up with no projects", async () => {
      const mockProject = { id: "first-project", name: "New Design #99999" };

      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/first-project");
    });

    test("handles failed sign up", async () => {
      const errorResult = { success: false, error: "Email already exists" };

      vi.mocked(actions.signUp).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password");
      });

      expect(signUpResult).toEqual(errorResult);
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    test("resets loading state on error", async () => {
      vi.mocked(actions.signUp).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password123");
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("loading state", () => {
    test("sets loading to true during sign in", async () => {
      vi.mocked(actions.signIn).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
        { id: "p1", name: "Project" },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("test@example.com", "password");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("sets loading to true during sign up", async () => {
      vi.mocked(actions.signUp).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
        { id: "p1", name: "Project" },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("test@example.com", "password");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
