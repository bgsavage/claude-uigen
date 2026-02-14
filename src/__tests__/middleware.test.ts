import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((body, init) => ({
        body,
        status: init?.status,
        headers: new Headers(),
      })),
      next: vi.fn(() => ({
        headers: new Headers(),
      })),
    },
  };
});

const { NextResponse } = await import("next/server");

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (pathname: string) => {
    return {
      nextUrl: {
        pathname,
      },
      cookies: {
        get: vi.fn(),
      },
    } as unknown as NextRequest;
  };

  describe("protected routes", () => {
    test("allows access to /api/projects with valid session", async () => {
      const mockSession = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 10000),
      };
      vi.mocked(auth.verifySession).mockResolvedValue(mockSession);

      const request = createMockRequest("/api/projects");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("denies access to /api/projects without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/projects");
      const response = await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 }
      );
      expect(response.status).toBe(401);
    });

    test("allows access to /api/filesystem with valid session", async () => {
      const mockSession = {
        userId: "user-456",
        email: "user@example.com",
        expiresAt: new Date(Date.now() + 10000),
      };
      vi.mocked(auth.verifySession).mockResolvedValue(mockSession);

      const request = createMockRequest("/api/filesystem");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("denies access to /api/filesystem without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/filesystem");
      const response = await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 }
      );
      expect(response.status).toBe(401);
    });

    test("denies access to /api/projects/123 without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/projects/123");
      const response = await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 }
      );
      expect(response.status).toBe(401);
    });

    test("allows access to /api/projects/123/edit with valid session", async () => {
      const mockSession = {
        userId: "user-789",
        email: "another@example.com",
        expiresAt: new Date(Date.now() + 10000),
      };
      vi.mocked(auth.verifySession).mockResolvedValue(mockSession);

      const request = createMockRequest("/api/projects/123/edit");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("denies access to /api/filesystem/delete without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/filesystem/delete");
      const response = await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 }
      );
      expect(response.status).toBe(401);
    });
  });

  describe("unprotected routes", () => {
    test("allows access to /api/chat without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/chat");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("allows access to /api/chat with session", async () => {
      const mockSession = {
        userId: "user-999",
        email: "logged-in@example.com",
        expiresAt: new Date(Date.now() + 10000),
      };
      vi.mocked(auth.verifySession).mockResolvedValue(mockSession);

      const request = createMockRequest("/api/chat");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("allows access to / without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("allows access to /login without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/login");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("allows access to /api/other-endpoint without session", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/other-endpoint");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    test("handles path that almost matches protected route", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/project");
      await middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    test("handles path with trailing slash", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/api/projects/");
      const response = await middleware(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 }
      );
      expect(response.status).toBe(401);
    });

    test("verifies session is called for all requests", async () => {
      vi.mocked(auth.verifySession).mockResolvedValue(null);

      const request = createMockRequest("/random-path");
      await middleware(request);

      expect(auth.verifySession).toHaveBeenCalledWith(request);
    });
  });
});
