/**
 * Centralized API, error, and success messages. Use these instead of hardcoded strings.
 */

// Generic / HTTP
export const UNAUTHORIZED = "Unauthorized";
export const FORBIDDEN = "Forbidden";
export const INVALID_TOKEN = "Invalid token";
export const NO_TOKEN_PROVIDED = "No token provided";
export const INTERNAL_SERVER_ERROR = "Internal server error";
export const SOMETHING_WENT_WRONG = "Something went wrong!";
export const AUTHENTICATION_REQUIRED = "Authentication required";
export const UNKNOWN_ERROR = "Unknown error";

// Status / system
export const SYSTEM_WORKING = "System working";

// Auth
export const LOGIN_FAILED = "Login failed";
export const SIGNUP_FAILED = "Signup failed";
export const REFRESH_FAILED = "Refresh failed";
export const LOGOUT_FAILED = "Logout failed";
export const REFRESH_TOKEN_REQUIRED = "refreshToken is required";
export const PASSWORD_RESET_EMAIL_SENT = "Password reset email sent";
export const PASSWORD_RESET_SUCCESS = "Password reset successful";
export const INVALID_USER = "Invalid user";
export const INVALID_CREDENTIALS = "Invalid credentials";
export const INVALID_OR_EXPIRED_REFRESH_TOKEN = "Invalid or expired refresh token";
export const EMAIL_ALREADY_REGISTERED = "Email already registered";
export const ORG_NAME_ALREADY_EXISTS = "An organization with this name already exists";

// Student
export const STUDENT_NOT_FOUND = "Student not found";
export const FAILED_FETCH_STUDENT_PROFILE = "Failed to fetch student profile";
export const FAILED_FETCH_LEAVE_STATS = "Failed to fetch leave statistics";
export const FAILED_FETCH_LEAVES = "Failed to fetch leaves";
export const END_DATE_BEFORE_START = "End date cannot be before start date";
export const FAILED_SUBMIT_LEAVE = "Failed to submit leave application";
export const FAILED_UPDATE_PROFILE = "Failed to update profile";
export const FAILED_FETCH_DASHBOARD = "Failed to fetch dashboard data";
export const PASSWORD_UPDATED_SUCCESS = "Password updated successfully";
export const STUDENT_OR_ROOM_NOT_FOUND = "Student or room number not found";
export const FAILED_FETCH_ROOMMATES = "Failed to fetch roommates";
export const USER_ID_AND_FILE_REQUIRED = "User ID and file are required";
export const USER_MUST_BE_LINKED_TO_HOSTEL = "User must be linked to a hostel to upload profile picture";
export const USER_NOT_FOUND = "User not found";
export const PROFILE_PICTURE_UPDATED_SUCCESS = "Profile picture updated successfully";
export const ERROR_UPLOADING_PROFILE_PICTURE = "Error uploading profile picture";

// Staff
export const STAFF_NOT_FOUND = "Staff not found";
export const FAILED_FETCH_STAFF_PROFILE = "Failed to fetch staff profile";
export const FAILED_FETCH_LEAVE_STATISTICS = "Failed to fetch leave statistics";
export const FAILED_FETCH_PENDING_LEAVES = "Failed to fetch pending leaves";
export const FAILED_FETCH_DASHBOARD_DATA = "Failed to fetch dashboard data";
export const INVALID_ACTION = "Invalid action";
export const FAILED_REVIEW_LEAVE = "Failed to review leave";

// Parent
export const PARENT_OR_CHILDREN_NOT_FOUND = "Parent or children not found";
export const PARENT_OR_CHILD_NOT_FOUND = "Parent or child not found";
export const PARENT_NOT_FOUND = "Parent not found";

// Admin
export const ADMIN_USER_CREATED_SUCCESS = "Admin user created successfully";
export const FAILED_CREATE_ADMIN = "Failed to create admin user";
export const FAILED_ADD_HOSTEL = "Failed to add hostel";
export const FAILED_FETCH_HOSTELS = "Failed to fetch hostels";
export const FAILED_UPDATE_HOSTEL = "Failed to update hostel";
export const FAILED_DELETE_HOSTEL = "Failed to delete hostel";
export const HOSTEL_DELETED_SUCCESS = "Hostel deleted successfully";
export const BOTH_STUDENT_AND_PARENT_ID_REQUIRED = "Both studentId and parentId are required";
export const STUDENT_ASSIGNED_TO_PARENT_SUCCESS = "Student successfully assigned to parent";
export const ERROR_ASSIGNING_STUDENT_TO_PARENT = "Error assigning student to parent";
export const PARENT_STUDENT_RELATIONSHIP_REMOVED_SUCCESS = "Parent-student relationship removed successfully";
export const ERROR_REMOVING_PARENT_STUDENT_RELATIONSHIP = "Error removing parent-student relationship";
export const ERROR_FETCHING_STUDENT_PARENT_INFO = "Error fetching student-parent information";
export const ERROR_FETCHING_STUDENTS = "Error fetching students";
export const ERROR_FETCHING_PARENTS = "Error fetching parents";
export const PARENT_CREATED_SUCCESS = "Parent created successfully";
export const ERROR_CREATING_PARENT = "Error creating parent";
export const PARENT_UPDATED_SUCCESS = "Parent updated successfully";
export const ERROR_UPDATING_PARENT = "Error updating parent";
export const PARENT_DELETED_SUCCESS = "Parent deleted successfully";
export const ERROR_DELETING_PARENT = "Error deleting parent";
export const ERROR_FETCHING_STAFF = "Error fetching staff";
export const STAFF_CREATED_SUCCESS = "staff created successfully";
export const ERROR_CREATING_STAFF = "Error creating staff";
export const STAFF_DELETED_SUCCESS = "staff deleted successfully";
export const ERROR_DELETING_STAFF = "Error deleting staff";
export const ID_PARAMETER_REQUIRED = "ID parameter is required";
export const FAILED_FETCH_LEAVE = "Failed to fetch leave";
export const LEAVE_DELETED_SUCCESS = "leave deleted successfully";
export const FAILED_CHANGE_PASSWORD = "Failed to change password";
export const ERROR_DELETING_LEAVE = "Error deleting leave";
export const STUDENT_UPDATED_SUCCESS = "student updated successfully";
export const ERROR_UPDATING_STUDENT = "Error updating student";
export const STUDENT_DELETED_SUCCESS = "student deleted successfully";
export const ERROR_DELETING_STUDENT = "Error deleting student";
export const ERROR_FINDING_STUDENT = "Error finding student";
export const ERROR_FINDING_STAFF = "Error finding staff";
export const STAFF_UPDATED_SUCCESS = "staff updated successfully";
export const ERROR_UPDATING_STAFF = "Error updating staff";
export const ERROR_FINDING_PARENT = "Error finding Parent";
export const FORBIDDEN_ADMINS_ONLY = "Forbidden: Admins only";
export const STUDENT_ID_AND_ROOM_REQUIRED = "Student ID and room number are required";
export const INVALID_STUDENT_ID_FORMAT = "Invalid student ID format";
export const FAILED_ASSIGN_OR_UPDATE_ROOM = "Failed to assign or update room";

// Mess
export const PERMISSION_DENIED = "Permission denied.";
export const NO_FILE_UPLOADED = "No file uploaded.";
export const NO_HOSTEL_FOUND = "No hostel found. Provide hostelId or ensure at least one hostel exists.";
export const HOSTEL_NOT_FOUND = "Hostel not found.";
export const PHOTO_UPLOADED_SUCCESS = "Photo uploaded successfully.";
export const ERROR_UPLOADING_PHOTO = "Error uploading photo.";
export const NO_MESS_PHOTO_FOUND = "No mess photo found.";
export const ERROR_FETCHING_MESS_PHOTO = "Error fetching mess photo.";
export const MESS_PHOTO_DELETED_SUCCESS = "Mess photo deleted successfully.";
export const ERROR_DELETING_PHOTO = "Error deleting photo.";

// Announcements
export const ERROR_FETCHING_ANNOUNCEMENTS = "Error fetching announcements";
export const ERROR_POSTING_STUDENT_ANNOUNCEMENT = "Error posting student announcement";
export const ERROR_FETCHING_GENERAL_ANNOUNCEMENTS = "Error fetching general announcements";
export const ERROR_POSTING_GENERAL_ANNOUNCEMENT = "Error posting general announcement";
export const ANNOUNCEMENT_DELETED_SUCCESS = "Announcement deleted successfully";
export const ANNOUNCEMENT_NOT_FOUND = "Announcement not found";
export const ERROR_CREATING_ANNOUNCEMENT = "Error creating announcement";
export const ERROR_UPDATING_ANNOUNCEMENT = "Error updating announcement";

// Complaints
export const FAILED_CREATE_COMPLAINT = "Failed to create complaint";
export const COMPLAINT_DELETED_SUCCESS = "Complaint deleted successfully";

// CSV
export const CSV_FILE_REQUIRED = "CSV file is required";
export const ONLY_CSV_ALLOWED = "Only CSV files are allowed";
export const CSV_PROCESSED_SUCCESS = "CSV processed successfully";
export const ERROR_DURING_CSV_IMPORT = "An error occurred during CSV import";
export const CSV_PARSE_ERROR = "CSV parse error";

// Upload middleware
export const FAILED_TO_PARSE_UPLOAD = "Failed to parse upload";

// Leave middleware
export const INVALID_ACTION_APPROVE_OR_REJECT = "Invalid action. Must be either 'approve' or 'reject'";
export const REMARKS_MUST_BE_STRING = "Remarks must be a string";
export const VALIDATION_FAILED = "Validation failed";

// Server / startup
export const DATABASE_URL_NOT_SET = "DATABASE_URL is not set. Set it in .env to connect to PostgreSQL.";
export const CONNECTED_POSTGRES = "Connected to PostgreSQL (Prisma)";
export const DATABASE_NOT_CONNECTED = "Database not connected";
export const CONNECTED_REDIS = "Connected to Redis";
export const REDIS_NOT_CONNECTED = "Redis not connected";
export const REDIS_URL_NOT_SET = "REDIS_URL not set; skipping Redis";
export const STARTUP_ERROR = "Startup error";
export const UNHANDLED_REJECTION = "Unhandled Rejection at";
export const UNCAUGHT_EXCEPTION = "Uncaught Exception";

// Scripts (createAdmin)
export const ADMIN_ALREADY_EXISTS = "Admin user already exists";
export const SUPER_ADMIN_CREATED = "Super-admin user created successfully (role_id 0)";
export const ERROR_CREATING_ADMIN_USER = "Error creating admin user";

// Service-layer errors (AdminService, AuthService, ComplaintsService, RoomService, etc.)
export const USER_ALREADY_EXISTS = "User already exists";
export const ORG_NAME_AND_CODE_REQUIRED = "organizationId, name and code are required";
export const NOT_ADMIN_FOR_ORG = "You are not an admin for this organization";
export const ORGANIZATION_NOT_FOUND = "Organization not found";
export const HOSTEL_CODE_ALREADY_EXISTS = "A hostel with this code already exists in this organization";
export const STUDENT_OR_PARENT_NOT_FOUND = "Student or parent not found or invalid roles";
export const STUDENT_ALREADY_HAS_PARENT = "Student already has a parent assigned";
export const STUDENT_NO_PARENT_ASSIGNED = "Student doesn't have a parent assigned";
export const PARENT_EMAIL_ALREADY_EXISTS = "Parent with this email already exists";
export const STAFF_EMAIL_ALREADY_EXISTS = "staff with this email already exists";
export const STAFF_NOT_FOUND_LOWER = "staff not found";
export const LEAVE_NOT_FOUND = "Leave not found";
export const LEAVE_NOT_FOUND_LOWER = "leave not found";
export const STUDENT_NOT_FOUND_LOWER = "student not found";
export const DESCRIPTION_REQUIRED = "Description is required";
export const INVALID_COMPLAINT_TYPE = "Invalid complaint type";
export const ONLY_STUDENTS_CAN_CREATE_COMPLAINTS = "Only students can create complaints";
export const STUDENT_MUST_BELONG_TO_HOSTEL = "Student must belong to a hostel to create a complaint";
export const COMPLAINT_NOT_FOUND_OR_UNAUTHORIZED = "Complaint not found or unauthorized";
export const DESCRIPTION_CANNOT_BE_EMPTY = "Description cannot be empty";
export const COMPLAINT_NOT_FOUND = "Complaint not found";
export const NO_CHILDREN_FOUND = "No children found";
export const STUDENT_NOT_IN_HOSTEL = "Student not found or not in a hostel";

/** Helper for dynamic message: "Leave {action}ed by parent" */
export function leaveActionedByParent(action: string): string {
  return `Leave ${action}ed by parent`;
}

/** Helper for dynamic message: "Leave {action}ed successfully" */
export function leaveActionedSuccess(action: string): string {
  return `Leave ${action}ed successfully`;
}

/** Helper for dynamic message: "Room {roomNumber} assigned successfully" */
export function roomAssignedSuccess(roomNumber: string): string {
  return `Room ${roomNumber} assigned successfully`;
}

/** Helper for dynamic message: "Server is running on port {port}" */
export function serverRunning(port: string | number): string {
  return `Server is running on port ${port}`;
}
