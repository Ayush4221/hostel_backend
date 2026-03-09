/**
 * OpenAPI 3 spec built from Zod schemas. Single source of truth for docs and optional validation.
 */
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ----- Schemas -----
const UserResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.string(),
    roleId: z.number().optional(),
    organizationId: z.string().uuid().optional().describe("Present when user has org context (e.g. org admin); used by API so client need not send it"),
    roomNumber: z.string().optional(),
    children: z.array(z.string()).optional(),
  })
  .openapi("UserResponse");

const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi("LoginRequest");

const LoginResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    user: UserResponseSchema,
  })
  .openapi("LoginResponse");

const OrgSignupRequestSchema = z
  .object({
    orgName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .openapi("OrgSignupRequest");

const OrganizationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  })
  .openapi("Organization");

const RefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .openapi("RefreshRequest");

const MessageSchema = z.object({ message: z.string() }).openapi("Message");

const ForgotPasswordRequestSchema = z
  .object({
    email: z.string().email(),
  })
  .openapi("ForgotPasswordRequest");

const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(1),
  })
  .openapi("ResetPasswordRequest");

// ----- Admin / Shared request schemas -----
const CreateAdminRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .openapi("CreateAdminRequest");

const AddHostelRequestSchema = z
  .object({
   name: z.string().min(1),
    code: z.string().min(1),
    address: z.string().optional(),
    city: z.string().optional(),
  })
  .openapi("AddHostelRequest");

const CreateParentRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .openapi("CreateParentRequest");

const UpdateParentRequestSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .openapi("UpdateParentRequest");

const AssignParentRequestSchema = z
  .object({
    studentId: z.string().uuid(),
    parentId: z.string().uuid(),
  })
  .openapi("AssignParentRequest");

const CreateStaffRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .openapi("CreateStaffRequest");

const UpdateStaffRequestSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .openapi("UpdateStaffRequest");

const LeaveReviewRequestSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    remarks: z.string().optional(),
  })
  .openapi("LeaveReviewRequest");

const AdminLeaveReviewRequestSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
  })
  .openapi("AdminLeaveReviewRequest");

const CreateAnnouncementRequestSchema = z
  .object({
    type: z.string().min(1),
    title: z.string().min(1),
    content: z.string().min(1),
    targetAudience: z.string().optional(),
    organizationId: z.string().uuid().optional(),
  })
  .openapi("CreateAnnouncementRequest");

const UpdateAnnouncementRequestSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    targetAudience: z.string().optional(),
  })
  .openapi("UpdateAnnouncementRequest");

const AssignRoomRequestSchema = z
  .object({
    studentId: z.string().uuid(),
    roomNumber: z.string().min(1),
    hostelId: z.number().int().optional().describe("Hostel ID (integer); optional if user has single hostel context"),
  })
  .openapi("AssignRoomRequest");

const EditStudentRequestSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    roomNumber: z.string().optional(),
  })
  .openapi("EditStudentRequest");

const UpdatePasswordRequestSchema = z
  .object({
    password: z.string().min(1),
  })
  .openapi("UpdatePasswordRequest");

const ApplyLeaveRequestSchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().min(1),
    leaveType: z.string().min(1),
    contactNumber: z.string().optional(),
    parentContact: z.string().optional(),
    address: z.string().optional(),
  })
  .openapi("ApplyLeaveRequest");

const UpdateStudentProfileRequestSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    roomNumber: z.string().optional(),
  })
  .openapi("UpdateStudentProfileRequest");

const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(1),
  })
  .openapi("ChangePasswordRequest");

const CreateComplaintRequestSchema = z
  .object({
    description: z.string().min(1),
    type: z.enum(["Maintenance", "Disciplinary", "Other"]),
  })
  .openapi("CreateComplaintRequest");

const UpdateComplaintRequestSchema = z
  .object({
    description: z.string().optional(),
    status: z.string().optional(),
    type: z.enum(["Maintenance", "Disciplinary", "Other"]).optional(),
  })
  .openapi("UpdateComplaintRequest");

const UpdateParentProfileRequestSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .openapi("UpdateParentProfileRequest");

// ----- Paths -----
registry.registerPath({
  method: "get",
  path: "/api/status",
  summary: "Health check",
  tags: ["Health"],
  responses: {
    200: { description: "System working" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  summary: "Login",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Login success", content: { "application/json": { schema: LoginResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: MessageSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/org-signup",
  summary: "Signup (single route: creates organization + org admin; then use /api/admin/hostels and /api/admin/staff-create)",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: OrgSignupRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Signup success (includes accessToken, refreshToken, user, organization)",
      content: { "application/json": { schema: LoginResponseSchema } },
    },
    400: { description: "Bad request", content: { "application/json": { schema: MessageSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/refreshtoken",
  summary: "Refresh access token",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "New tokens", content: { "application/json": { schema: LoginResponseSchema } } },
    401: { description: "Invalid refresh token", content: { "application/json": { schema: MessageSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/signout",
  summary: "Logout (invalidate refresh token)",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: RefreshRequestSchema,
        },
      },
    },
  },
  responses: { 200: { description: "Signed out" } },
});

registry.registerPath({
  method: "post",
  path: "/api/password/forgot-password",
  summary: "Request password reset email",
  tags: ["Password"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ForgotPasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Reset email sent", content: { "application/json": { schema: MessageSchema } } },
    400: { description: "User not found", content: { "application/json": { schema: MessageSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/password/reset-password",
  summary: "Reset password with token",
  tags: ["Password"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ResetPasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Password reset success", content: { "application/json": { schema: MessageSchema } } },
    400: { description: "Invalid or expired token", content: { "application/json": { schema: MessageSchema } } },
  },
});

// ----- Admin routes (Bearer required) -----
registry.registerPath({
  method: "post",
  path: "/api/admin/create",
  summary: "Create admin",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateAdminRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Admin created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

const HostelListItemSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    studentCount: z.number().int().min(0),
  })
  .openapi("HostelListItem");

const HostelListPaginatedResponseSchema = z
  .object({
    items: z.array(HostelListItemSchema),
    total: z.number().int().min(0),
    pageNumber: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  })
  .openapi("HostelListPaginatedResponse");

const HostelDetailSchema = z
  .object({
    id: z.number().int(),
    organizationId: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    isActive: z.boolean(),
    studentCount: z.number().int().min(0),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("HostelDetail");

const UpdateHostelRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateHostelRequest");

registry.registerPath({
  method: "get",
  path: "/api/admin/hostels",
  summary: "Get hostels with pagination. Query: pageSize, pageNumber, searchText. Super admin: all; org admin: hostels in their org.",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      pageSize: z.coerce.number().int().min(1).max(100).optional().describe("Items per page (default 10)"),
      pageNumber: z.coerce.number().int().min(1).optional().describe("Page number (default 1)"),
      searchText: z.string().optional().describe("Filter by hostel name or code (case-insensitive)"),
    }),
  },
  responses: {
    200: {
      description: "Paginated list of hostels with student count",
      content: { "application/json": { schema: HostelListPaginatedResponseSchema } },
    },
    401: { description: "Unauthorized" },
    500: { description: "Server error" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/hostels/{id}",
  summary: "Get hostel by ID (with student count)",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number().int().min(1) }) },
  responses: {
    200: { description: "Hostel details", content: { "application/json": { schema: HostelDetailSchema } } },
    400: { description: "Invalid ID" },
    404: { description: "Hostel not found" },
    401: { description: "Unauthorized" },
    500: { description: "Server error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/hostels",
  summary: "Create hostel",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: AddHostelRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Hostel created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" }, 403: { description: "Forbidden" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/hostels/{id}",
  summary: "Update hostel",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number().int().min(1) }),
    body: {
      content: {
        "application/json": { schema: UpdateHostelRequestSchema },
      },
    },
  },
  responses: {
    200: { description: "Hostel updated", content: { "application/json": { schema: z.object({ id: z.number(), organizationId: z.string(), name: z.string(), code: z.string(), address: z.string().optional(), city: z.string().optional(), isActive: z.boolean() }).openapi("HostelUpdated") } } },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Hostel not found" },
    500: { description: "Server error" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/hostels/{id}",
  summary: "Delete hostel",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number().int().min(1) }) },
  responses: {
    200: { description: "Hostel deleted", content: { "application/json": { schema: MessageSchema } } },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Hostel not found" },
    500: { description: "Server error" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/parents",
  summary: "Get all parents",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of parents" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/student-parent/{studentId}",
  summary: "Get student parent info",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Student parent info" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/complaints",
  summary: "Get all complaints",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of complaints" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/parent",
  summary: "Create parent",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateParentRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Parent created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/parent/{id}",
  summary: "Update parent",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateParentRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Parent updated" }, 401: { description: "Unauthorized" }, 404: { description: "Parent not found" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/parent/{id}",
  summary: "Delete parent",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Parent deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/parent/{id}",
  summary: "Get parent by ID",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Parent details" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/assign-parent",
  summary: "Assign parent to student",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: AssignParentRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Parent assigned" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" }, 404: { description: "Student or parent not found" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/remove-parent/{studentId}",
  summary: "Remove parent from student",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Parent removed" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/deletecomplaint/{id}",
  summary: "Delete complaint",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Complaint deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/getallstaffs",
  summary: "Get all staff",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of staff" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/staff-create",
  summary: "Create staff",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateStaffRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Staff created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/delete-staff/{id}",
  summary: "Delete staff",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Staff deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/staff/{id}",
  summary: "Get staff by ID",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Staff details" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/staff/edit/{id}",
  summary: "Update staff",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateStaffRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Staff updated" }, 401: { description: "Unauthorized" }, 404: { description: "Staff not found" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/getallleaves",
  summary: "Get all leaves",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of leaves" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/getstudentleaveid/{id}",
  summary: "Get leave by ID",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Leave details" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/delete-leave/{id}",
  summary: "Delete leave",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Leave deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/leaves/{leaveId}/review",
  summary: "Approve/reject leave (admin)",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: AdminLeaveReviewRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Leave reviewed" }, 400: { description: "Invalid action" }, 401: { description: "Unauthorized" }, 404: { description: "Leave not found" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/upload-mess-menu",
  summary: "Upload mess menu (image)",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "multipart/form-data": { schema: z.object({ messPhoto: z.any() }).openapi("MessUpload") } } } },
  responses: { 200: { description: "Menu uploaded" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/mess-menu",
  summary: "Get mess menu",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Mess menu" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/delete-menu",
  summary: "Delete mess menu",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Menu deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/get-All-Roomamtes",
  summary: "Get all roommates",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of roommates" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/assign-room",
  summary: "Assign room to student",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: AssignRoomRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Room assigned" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/update-room",
  summary: "Update room assignment",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: AssignRoomRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Room updated" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/getadminannouncment",
  summary: "Get all announcements",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of announcements" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/createadminannouncment",
  summary: "Create announcement",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateAnnouncementRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Announcement created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/update-announcment/{type}/{id}",
  summary: "Update announcement",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateAnnouncementRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Announcement updated" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" }, 404: { description: "Not found" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/delete-announcment/{type}/{id}",
  summary: "Delete announcement",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Announcement deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/import-csv",
  summary: "Import users from CSV",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "multipart/form-data": { schema: z.object({ file: z.any() }).openapi("CsvUpload") } } } },
  responses: { 200: { description: "CSV imported" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/students",
  summary: "Get all students",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of students" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/student/{id}",
  summary: "Edit student",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: EditStudentRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Student updated" }, 401: { description: "Unauthorized" }, 404: { description: "Student not found" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/delete-student/{id}",
  summary: "Delete student",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Student deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/student/{id}",
  summary: "Get student by ID",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Student details" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/admin/updatepasswords/{id}",
  summary: "Update user password",
  tags: ["Admin"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdatePasswordRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Password updated" }, 401: { description: "Unauthorized" }, 404: { description: "User not found" } },
});

// ----- Student routes (Bearer required) -----
registry.registerPath({
  method: "get",
  path: "/api/student/profile",
  summary: "Get student profile",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Student profile" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/student/profile",
  summary: "Update student profile",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateStudentProfileRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Profile updated" }, 401: { description: "Unauthorized" }, 404: { description: "Student not found" } },
});

registry.registerPath({
  method: "put",
  path: "/api/student/change-password",
  summary: "Change student password",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: ChangePasswordRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Password changed" }, 400: { description: "Incorrect current password" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/leaves",
  summary: "Get student leaves",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of leaves" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/student/leaves/apply",
  summary: "Apply for leave",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: ApplyLeaveRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Leave submitted" }, 400: { description: "Bad request / dates invalid" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/leave-stats",
  summary: "Get leave stats",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Leave statistics" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/dashboard",
  summary: "Get student dashboard",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Dashboard data" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/roommates",
  summary: "Get roommates",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of roommates" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/student/complaint",
  summary: "Create complaint",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateComplaintRequestSchema },
      },
    },
  },
  responses: { 201: { description: "Complaint created" }, 400: { description: "Bad request" }, 401: { description: "Unauthorized" }, 403: { description: "Forbidden" } },
});

registry.registerPath({
  method: "patch",
  path: "/api/student/complaint-update/{id}",
  summary: "Update complaint",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateComplaintRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Complaint updated" }, 401: { description: "Unauthorized" }, 404: { description: "Complaint not found" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/complaint",
  summary: "Get student complaints",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of complaints" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "delete",
  path: "/api/student/complaint/{id}",
  summary: "Delete complaint",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Complaint deleted" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/student/upload-profile-pic",
  summary: "Upload profile picture",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "multipart/form-data": { schema: z.object({ profilePic: z.any() }).openapi("ProfilePicUpload") } } } },
  responses: { 200: { description: "Picture uploaded" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/mess-menu",
  summary: "Get mess menu",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Mess menu" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/student/getAnnouncments",
  summary: "Get student announcements",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of announcements" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/student/create-announcement",
  summary: "Create student announcement",
  tags: ["Student"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Announcement created" }, 401: { description: "Unauthorized" } },
});

// ----- Staff routes (Bearer required) -----
registry.registerPath({
  method: "get",
  path: "/api/staff/profile",
  summary: "Get staff profile",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Staff profile" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/leaves",
  summary: "Get all leaves",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of leaves" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/leaves/pending",
  summary: "Get pending leaves",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Pending leaves" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/staff/leaves/{leaveId}/review",
  summary: "Review leave",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: LeaveReviewRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Leave reviewed" }, 400: { description: "Invalid action / already reviewed" }, 401: { description: "Unauthorized" }, 404: { description: "Leave not found" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/leave-stats",
  summary: "Get leave stats",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Leave statistics" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/dashboard",
  summary: "Get staff dashboard",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Dashboard data" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/staff/change-password",
  summary: "Change staff password",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: ChangePasswordRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Password changed" }, 400: { description: "Incorrect current password" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/complaints",
  summary: "Get complaints",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of complaints" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/staff/upload-mess-menu",
  summary: "Upload mess menu",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "multipart/form-data": { schema: z.object({ messPhoto: z.any() }).openapi("MessUploadStaff") } } } },
  responses: { 200: { description: "Menu uploaded" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/mess-menu",
  summary: "Get mess menu",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Mess menu" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/staff/getstaffAnnouncments",
  summary: "Get staff announcements",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of announcements" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/staff/create-staffAanouncments",
  summary: "Create staff announcement",
  tags: ["Staff"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Announcement created" }, 401: { description: "Unauthorized" } },
});

// ----- Parent routes (Bearer required) -----
registry.registerPath({
  method: "get",
  path: "/api/parent/profile",
  summary: "Get parent profile",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Parent profile" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/api/parent/profile",
  summary: "Update parent profile",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateParentProfileRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Profile updated" }, 401: { description: "Unauthorized" }, 404: { description: "Parent not found" } },
});

registry.registerPath({
  method: "get",
  path: "/api/parent/child-stats",
  summary: "Get child stats",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Child statistics" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/parent/child-info",
  summary: "Get child info",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Child info" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/parent/child-leaves",
  summary: "Get child leaves",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Child leaves" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/api/parent/leaves/{leaveId}/review",
  summary: "Review child leave",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: LeaveReviewRequestSchema },
      },
    },
  },
  responses: { 200: { description: "Leave reviewed" }, 400: { description: "Invalid action / already reviewed" }, 401: { description: "Unauthorized" }, 404: { description: "Leave not found" } },
});

registry.registerPath({
  method: "get",
  path: "/api/parent/dashboard",
  summary: "Get parent dashboard",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Dashboard data" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/api/parent/complaints",
  summary: "Get parent complaints",
  tags: ["Parent"],
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List of complaints" }, 401: { description: "Unauthorized" } },
});

// ----- Generate document -----
const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

export function getOpenApiSpec(): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "NIVAS API",
      version: "1.0.0",
      description: "Backend API. Use Authorize to set Bearer token after login.",
    },
    servers: [{ url: baseUrl, description: "Current server" }],
    security: [{ bearerAuth: [] }],
  });
  const docObj = doc as unknown as Record<string, unknown>;
  if (!docObj.components) docObj.components = {};
  const comp = docObj.components as Record<string, unknown>;
  comp.securitySchemes = {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT access token from /api/auth/login or /api/auth/refreshtoken",
    },
  };
  return doc as object;
}

// Export schemas for optional validation middleware
export { LoginRequestSchema, OrgSignupRequestSchema, RefreshRequestSchema, ForgotPasswordRequestSchema, ResetPasswordRequestSchema };
