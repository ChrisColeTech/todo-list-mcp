# Todo List MCP Server

A comprehensive Model Context Protocol (MCP) server that provides advanced todo management with bulk operations, task sequencing, and smart validation.

<a href="https://glama.ai/mcp/servers/kh39rjpplx">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/kh39rjpplx/badge" alt="Todo List Server MCP server" />
</a>

> **📚 Learning Resource**: This project is designed as an educational example of MCP implementation. See [GUIDE.md](GUIDE.md) for a comprehensive explanation of how the project works and why things are implemented the way they are.

## Features

### **Core Todo Management**
- **Create todos**: Add individual tasks with auto-assigned task numbers
- **Update todos**: Modify existing tasks while preserving task numbers
- **Complete todos**: Mark tasks as done with completion timestamps
- **Delete todos**: Remove tasks from the list
- **Search todos**: Find tasks by title or creation date
- **Summarize todos**: Get quick overviews of active tasks

### **Bulk Operations & Workflow**
- **Bulk task creation**: Create multiple tasks from folder contents
- **Template system**: Use inline templates or template files with auto-injection
- **Sequential workflow**: Get next task in numbered sequence
- **Task numbering**: All tasks get sequential numbers for predictable ordering
- **Status management**: Track tasks as 'New' or 'Done'

### **Smart Validation**
- **Duplicate prevention**: Automatically detects and prevents duplicate tasks
- **File validation**: Ensures task files exist and templates are readable
- **Path management**: Associates tasks with specific file paths
- **Error handling**: Clear error messages and validation feedback

## Tools Reference

This MCP server provides 14 comprehensive tools. Each tool example shows the exact format for LLM usage:

### **📋 Quick Reference Index**

| Tool | Purpose | Parameters |
|------|---------|------------|
| [`create-todo`](#1-create-todo---create-a-new-todo-with-auto-assigned-task-number) | Create single task with auto-assigned task number | `title` (string, required, min 1 char), `description` (string, required, min 1 char) |
| [`get-todo`](#2-get-todo---get-a-specific-todo-by-id) | Retrieve specific task details by UUID | `id` (UUID string, required, must be valid UUID format) |
| [`update-todo`](#3-update-todo---update-a-todos-title-or-description) | Modify existing task title/description | `id` (UUID, required), `title?` (string, optional, min 1 char), `description?` (string, optional, min 1 char) - **at least one of title/description required** |
| [`complete-todo`](#4-complete-todo---mark-a-todo-as-completed) | Mark task as done with timestamp | `id` (UUID string, required, must exist in database) |
| [`delete-todo`](#5-delete-todo---delete-a-todo) | Permanently remove task from database | `id` (UUID string, required, must exist in database) |
| [`update-status`](#6-update-status---update-a-todos-status) | Change task status to 'New' or 'Done' | `id` (UUID, required), `status` (enum, required, must be exactly 'New' or 'Done') |
| [`bulk-add-todos`](#7-bulk-add-todos---create-multiple-tasks-from-folder-contents) | Scan folder and create task per file with template | `folderPath` (absolute path, required, must exist), **EITHER** `template` (string, optional) **OR** `templateFilePath` (absolute path, optional, must exist) - **exactly one template method required** |
| [`clear-all-todos`](#8-clear-all-todos---delete-all-todos-from-the-database) | Delete entire task database (irreversible) | none |
| [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) | Get lowest numbered incomplete task | none |
| [`list-todos`](#10-list-todos---list-all-todos-with-task-numbers) | Show all tasks including completed ones | none |
| [`list-active-todos`](#11-list-active-todos---list-all-non-completed-todos) | Show only incomplete/pending tasks | none |
| [`search-todos-by-title`](#12-search-todos-by-title---search-todos-by-title) | Find tasks by partial title match (case-insensitive) | `title` (string, required, min 1 char, partial matching supported) |
| [`search-todos-by-date`](#13-search-todos-by-date---search-todos-by-creation-date) | Find tasks created on specific date | `date` (string, required, must match YYYY-MM-DD format exactly) |
| [`summarize-active-todos`](#14-summarize-active-todos---generate-summary-of-active-todos) | Generate markdown overview of incomplete tasks | none |

**⚠️ Important Parameter Constraints:**
- **bulk-add-todos**: You must provide **EITHER** `template` (inline text) **OR** `templateFilePath` (path to file), but **NEVER BOTH**. The tool will error if you provide both or neither.
- **update-todo**: At least one of `title` or `description` must be provided (cannot update with no changes).
- **All file paths**: Must be absolute paths (starting with `/` on Unix or `C:\` on Windows), not relative paths.

### **🎯 Workflow Examples**

#### **🔄 Sequential Task Processing** (Main Workflow)
**User prompt:** *"I have a folder of task files at `/project/tasks` and want to work through them one by one. Use the bulk-add-todos tool to create tasks for all files with this template: 'Review and process this file according to project requirements. Check for completeness and accuracy.' Then use get-next-todo to help me work through them in order."*

Process tasks in numbered order with bulk creation:
1. [`bulk-add-todos`](#7-bulk-add-todos---create-multiple-tasks-from-folder-contents) → Create tasks from folder
2. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Get Task 1
3. [`complete-todo`](#4-complete-todo---mark-a-todo-as-completed) → Mark Task 1 done
4. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Get Task 2
5. Repeat steps 3-4 until all done

#### **📝 Individual Task Management**
**User prompt:** *"Use create-todo to create a task titled 'Fix payment gateway bug' with description 'Investigate login failures in OAuth flow. Check JWT validation and redirect URLs. Test with multiple providers.' Then help me update it with update-todo if needed and use complete-todo when done."*

Create and manage single tasks:
1. [`create-todo`](#1-create-todo---create-a-new-todo-with-auto-assigned-task-number) → Create single task
2. [`update-todo`](#3-update-todo---update-a-todos-title-or-description) → Modify if needed
3. [`complete-todo`](#4-complete-todo---mark-a-todo-as-completed) → Mark done

#### **🔍 Task Discovery & Management**
**User prompt:** *"Use list-active-todos to show me what tasks are still pending, then search-todos-by-title with 'authentication' to find anything related to auth, and finally summarize-active-todos to give me a quick overview."*

Find and organize existing tasks:
- [`list-active-todos`](#11-list-active-todos---list-all-non-completed-todos) → See what's pending
- [`search-todos-by-title`](#12-search-todos-by-title---search-todos-by-title) → Find specific tasks
- [`summarize-active-todos`](#14-summarize-active-todos---generate-summary-of-active-todos) → Get overview

#### **🏗️ Project Setup Workflow**
**User prompt:** *"Use clear-all-todos to start fresh, then bulk-add-todos with folderPath '/new-project/src' and template 'Implement and test this module according to project specifications', then list-todos to see what got created, and finally get-next-todo to start work."*

Setting up a new project with tasks:
1. [`clear-all-todos`](#8-clear-all-todos---delete-all-todos-from-the-database) → Start fresh
2. [`bulk-add-todos`](#7-bulk-add-todos---create-multiple-tasks-from-folder-contents) → Create from project files
3. [`list-todos`](#10-list-todos---list-all-todos-with-task-numbers) → Review created tasks
4. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Begin work

#### **📊 Progress Tracking Workflow**
**User prompt:** *"Use summarize-active-todos to get current status, then search-todos-by-date with '2024-01-15' (today's date) to see what I created today, then list-active-todos to check remaining work, and finally get-next-todo to see what to work on next."*

Monitor project progress:
1. [`summarize-active-todos`](#14-summarize-active-todos---generate-summary-of-active-todos) → Get current status
2. [`search-todos-by-date`](#13-search-todos-by-date---search-todos-by-creation-date) → See today's tasks
3. [`list-active-todos`](#11-list-active-todos---list-all-non-completed-todos) → Check remaining work
4. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Continue working

#### **🔧 Task Maintenance Workflow**
**User prompt:** *"Use search-todos-by-title with 'database' to find related tasks, then get-todo with the specific task ID to review details, then update-todo with the same ID to add new requirements, and finally update-status with the ID and status 'Done' if completed."*

Updating and organizing tasks:
1. [`search-todos-by-title`](#12-search-todos-by-title---search-todos-by-title) → Find outdated tasks
2. [`get-todo`](#2-get-todo---get-a-specific-todo-by-id) → Review specific task
3. [`update-todo`](#3-update-todo---update-a-todos-title-or-description) → Update content
4. [`update-status`](#6-update-status---update-a-todos-status) → Adjust status if needed

#### **🎯 Daily Work Routine**
**User prompt:** *"Use summarize-active-todos for morning overview, then get-next-todo to see what to work on first. After completing work, use complete-todo with the task ID, then get-next-todo again to continue. At day's end, use list-active-todos to see what's left for tomorrow."*

Typical daily workflow:
1. [`summarize-active-todos`](#14-summarize-active-todos---generate-summary-of-active-todos) → Morning overview
2. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Get today's task
3. Work on task...
4. [`complete-todo`](#4-complete-todo---mark-a-todo-as-completed) → Mark done
5. [`get-next-todo`](#9-get-next-todo---get-the-next-task-to-work-on) → Continue
6. [`list-active-todos`](#11-list-active-todos---list-all-non-completed-todos) → End of day review

## **🚀 Advanced Use Cases**

### **Code Review Workflow**
**User prompt:** *"Use bulk-add-todos with folderPath '/path/to/changed/files' and template 'Review this file: 1. Check code quality and style 2. Verify logic and algorithms 3. Test edge cases 4. Check for security issues 5. Verify documentation' to create review tasks for each changed file."*

**What it does:** Systematically review every changed file in a pull request with consistent quality checks.

**How our MCP makes it better:**
- ✅ **No missed files**: Bulk creation ensures every file gets reviewed
- ✅ **Consistent standards**: Template ensures same quality checks for all files
- ✅ **Sequential processing**: Review files in order, never lose track of progress
- ✅ **Zero setup time**: One command creates complete review workflow

```xml
<!-- Create tasks for each file in a pull request -->
<invoke name="bulk-add-todos">
<parameter name="folderPath">/path/to/changed/files</parameter>
<parameter name="template">Review this file:
1. Check code quality and style
2. Verify logic and algorithms  
3. Test edge cases
4. Check for security issues
5. Verify documentation</parameter>
</invoke>

<!-- Process each file systematically -->
<invoke name="get-next-todo"></invoke>
<!-- Work on review... -->
<invoke name="complete-todo">
<parameter name="id">file-review-id</parameter>
</invoke>
```

### **Documentation Sprint**
**User prompt:** *"Use bulk-add-todos with folderPath '/project/src/modules' and templateFilePath '/templates/docs-template.md' to create documentation tasks for each module so I can work through them systematically."*

**What it does:** Create comprehensive documentation for all modules in a codebase during focused sprint sessions.

**How our MCP makes it better:**
- ✅ **Complete coverage**: Auto-discovers all modules, ensures nothing is missed
- ✅ **Standardized docs**: Template file ensures consistent documentation format
- ✅ **Progress visibility**: Real-time tracking of documentation completion
- ✅ **Scalable process**: Works for 10 modules or 1000 modules equally well

```xml
<!-- Create tasks for all undocumented modules -->
<invoke name="bulk-add-todos">
<parameter name="folderPath">/project/src/modules</parameter>
<parameter name="templateFilePath">/templates/documentation-task.md</parameter>
</invoke>

<!-- Track progress -->
<invoke name="summarize-active-todos"></invoke>
```

### **Bug Triage Workflow**
**User prompt:** *"Use create-todo with title 'Fix critical iOS login crash' and description 'Priority: High - Reproduce crash, analyze logs, identify root cause, implement fix, test on multiple iOS versions' to create a structured debugging task."*

**What it does:** Organize and prioritize bug fixes with structured investigation and resolution steps.

**How our MCP makes it better:**
- ✅ **Structured debugging**: Template ensures thorough investigation process
- ✅ **Priority management**: Easy re-prioritization with visual indicators
- ✅ **Task sequencing**: Auto-numbered tasks create natural priority queue
- ✅ **Progress tracking**: Clear visibility into which bugs are being worked on

```xml
<!-- Create individual tasks for each bug -->
<invoke name="create-todo">
<parameter name="title">Fix login crash on iOS</parameter>
<parameter name="description">**Priority: High**
- Reproduce the crash
- Analyze crash logs
- Identify root cause
- Implement fix
- Test on multiple iOS versions</parameter>
</invoke>

<!-- Prioritize by updating critical bugs -->
<invoke name="update-todo">
<parameter name="id">bug-id</parameter>
<parameter name="title">🚨 CRITICAL: Fix login crash on iOS</parameter>
</invoke>
```

### **Feature Development Pipeline**
**User prompt:** *"Use bulk-add-todos with folderPath '/features/user-auth/components' and template 'Implement component: 1. Create structure 2. Add TypeScript interfaces 3. Implement core logic 4. Add error handling 5. Write unit tests 6. Add integration tests 7. Update documentation' to break down the feature development."*

**What it does:** Break down complex features into component-level tasks with complete development lifecycle.

**How our MCP makes it better:**
- ✅ **Complete decomposition**: Every component gets full development workflow
- ✅ **Nothing forgotten**: Template ensures testing and docs aren't skipped
- ✅ **Parallel-ready**: Multiple developers can work on different components
- ✅ **Quality gates**: Built-in checkpoints for testing and documentation

```xml
<!-- Break down feature into tasks -->
<invoke name="bulk-add-todos">
<parameter name="folderPath">/features/user-auth/components</parameter>
<parameter name="template">Implement component:
1. Create component structure
2. Add TypeScript interfaces
3. Implement core logic
4. Add error handling
5. Write unit tests
6. Add integration tests
7. Update documentation</parameter>
</invoke>

<!-- Process in order -->
<invoke name="get-next-todo"></invoke>
```

### **Learning/Training Workflow**
**User prompt:** *"Use bulk-add-todos with folderPath '/learning/react-tutorials' and template 'Complete tutorial: 1. Read through completely 2. Follow along with examples 3. Complete all exercises 4. Build practice project 5. Take notes on key concepts 6. Research related topics' to create systematic learning tasks."*

**What it does:** Create structured learning paths with systematic progression through educational materials.

**How our MCP makes it better:**
- ✅ **Systematic learning**: Each tutorial gets complete learning workflow
- ✅ **No skipped lessons**: Bulk creation ensures all materials are covered
- ✅ **Progressive mastery**: Sequential completion builds knowledge systematically
- ✅ **Accountability**: Clear tracking of learning progress and completion

```xml
<!-- Create learning path -->
<invoke name="bulk-add-todos">
<parameter name="folderPath">/learning/react-tutorials</parameter>
<parameter name="template">Complete tutorial:
1. Read through the tutorial completely
2. Follow along with examples
3. Complete all exercises
4. Build the practice project
5. Take notes on key concepts
6. Research related topics</parameter>
</invoke>
```

### **Content Creation Pipeline**
**User prompt:** *"Use bulk-add-todos with folderPath '/content/blog-series' and template 'Write blog post: 1. Research topic thoroughly 2. Create detailed outline 3. Write first draft 4. Add code examples/screenshots 5. Review and edit 6. Proofread 7. Publish and promote' to manage the content series creation."*

**What it does:** Manage content series creation with consistent quality and publication workflow.

**How our MCP makes it better:**
- ✅ **Consistent quality**: Template ensures every post follows same quality process
- ✅ **Series completion**: Bulk creation guarantees full series gets planned
- ✅ **Publication pipeline**: Built-in workflow from research to promotion
- ✅ **Content calendar**: Sequential numbering creates natural publishing order

```xml
<!-- Create tasks for blog post series -->
<invoke name="bulk-add-todos">
<parameter name="folderPath">/content/blog-series</parameter>
<parameter name="template">Write blog post:
1. Research topic thoroughly
2. Create detailed outline
3. Write first draft
4. Add code examples/screenshots
5. Review and edit
6. Proofread
7. Publish and promote</parameter>
</invoke>
```

---

### **Individual Task Management**

#### 1. `create-todo` - Create a new todo with auto-assigned task number
Creates a single todo item with automatic task numbering and status initialization.

**Parameters:**
- `title` (string, required): The title of the todo
- `description` (string, required): Detailed description in markdown format

**Example:**
```xml
<invoke name="create-todo">
<parameter name="title">Fix authentication bug</parameter>
<parameter name="description">Investigate and fix the login issue where users can't authenticate with OAuth providers. Check the JWT token validation logic.</parameter>
</invoke>
```

#### 2. `get-todo` - Get a specific todo by ID
Retrieves the full details of a specific todo item using its UUID.

**Parameters:**
- `id` (string, required): The UUID of the todo to retrieve

**Example:**
```xml
<invoke name="get-todo">
<parameter name="id">550e8400-e29b-41d4-a716-446655440000</parameter>
</invoke>
```

#### 3. `update-todo` - Update a todo's title or description
Modifies an existing todo's title and/or description while preserving other fields.

**Parameters:**
- `id` (string, required): The UUID of the todo to update
- `title` (string, optional): New title for the todo
- `description` (string, optional): New description for the todo

**Example:**
```xml
<invoke name="update-todo">
<parameter name="id">550e8400-e29b-41d4-a716-446655440000</parameter>
<parameter name="title">Fix critical authentication bug</parameter>
<parameter name="description">**URGENT**: Investigate and fix the login issue where users can't authenticate with OAuth providers. Check the JWT token validation logic and verify redirect URLs.</parameter>
</invoke>
```

#### 4. `complete-todo` - Mark a todo as completed
Marks a todo as completed by setting both the completion timestamp and status to 'Done'.

**Parameters:**
- `id` (string, required): The UUID of the todo to mark as completed

**Example:**
```xml
<invoke name="complete-todo">
<parameter name="id">550e8400-e29b-41d4-a716-446655440000</parameter>
</invoke>
```

#### 5. `delete-todo` - Delete a todo
Permanently removes a todo from the database.

**Parameters:**
- `id` (string, required): The UUID of the todo to delete

**Example:**
```xml
<invoke name="delete-todo">
<parameter name="id">550e8400-e29b-41d4-a716-446655440000</parameter>
</invoke>
```

#### 6. `update-status` - Update a todo's status
Changes the status of a todo between 'New' and 'Done' without affecting completion timestamp.

**Parameters:**
- `id` (string, required): The UUID of the todo to update
- `status` (string, required): Either 'New' or 'Done'

**Example:**
```xml
<invoke name="update-status">
<parameter name="id">550e8400-e29b-41d4-a716-446655440000</parameter>
<parameter name="status">Done</parameter>
</invoke>
```

### **Bulk Operations**

#### 7. `bulk-add-todos` - Create multiple tasks from folder contents
Recursively scans a folder and creates one todo per file using a template with auto-injected metadata.

**Parameters:**
- `folderPath` (string, required): Absolute path to the folder to scan
- `template` (string, optional): Inline template text with instructions
- `templateFilePath` (string, optional): Path to a template file to read

*Note: Must provide either `template` OR `templateFilePath`, not both.*

**Example with inline template:**
```xml
<invoke name="bulk-add-todos">
<parameter name="folderPath">/home/user/project/tasks</parameter>
<parameter name="template">Steps:
1. Read the task file thoroughly
2. Execute all commands exactly as written
3. Test the implementation
4. Document any issues encountered</parameter>
</invoke>
```

**Example with template file:**
```xml
<invoke name="bulk-add-todos">
<parameter name="folderPath">/home/user/project/tasks</parameter>
<parameter name="templateFilePath">/home/user/templates/default-task.md</parameter>
</invoke>
```

#### 8. `clear-all-todos` - Delete all todos from the database
Removes all todos from the database and returns the count of deleted items.

**Parameters:** None

**Example:**
```xml
<invoke name="clear-all-todos">
</invoke>
```

### **Workflow & Navigation**

#### 9. `get-next-todo` - Get the next task to work on
Returns the todo with the lowest task number that has status != 'Done', providing sequential workflow progression.

**Parameters:** None

**Example:**
```xml
<invoke name="get-next-todo">
</invoke>
```

#### 10. `list-todos` - List all todos with task numbers
Returns all todos in the database, including completed ones, with full formatting.

**Parameters:** None

**Example:**
```xml
<invoke name="list-todos">
</invoke>
```

#### 11. `list-active-todos` - List all non-completed todos
Returns only todos that haven't been completed, filtered by completion status.

**Parameters:** None

**Example:**
```xml
<invoke name="list-active-todos">
</invoke>
```

### **Search & Discovery**

#### 12. `search-todos-by-title` - Search todos by title
Performs case-insensitive partial matching on todo titles.

**Parameters:**
- `title` (string, required): Search term to look for in todo titles

**Example:**
```xml
<invoke name="search-todos-by-title">
<parameter name="title">authentication</parameter>
</invoke>
```

#### 13. `search-todos-by-date` - Search todos by creation date
Finds todos created on a specific date.

**Parameters:**
- `date` (string, required): Date in YYYY-MM-DD format

**Example:**
```xml
<invoke name="search-todos-by-date">
<parameter name="date">2024-01-15</parameter>
</invoke>
```

#### 14. `summarize-active-todos` - Generate summary of active todos
Creates a markdown-formatted summary of all incomplete todos.

**Parameters:** None

**Example:**
```xml
<invoke name="summarize-active-todos">
</invoke>
```

## Installation

```bash
# Clone the repository
git clone https://github.com/RegiByte/todo-list-mcp.git
cd todo-list-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the Server

```bash
npm start
```

### Configuring with Claude for Desktop

#### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/absolute/path/to/todo-list-mcp/dist/index.js"]
    }
  }
}
```

#### Cursor

- Go to "Cursor Settings" -> MCP
- Add a new MCP server with a "command" type
- Add the absolute path of the server and run it with node
- Example: node /absolute/path/to/todo-list-mcp/dist/index.js

### Example Commands

When using with Claude for Desktop or Cursor, you can try:

#### **Individual Task Management**
- "Create a todo to learn MCP with a description explaining why MCP is useful"
- "Mark my learning MCP todo as completed"
- "List all my active todos"
- "Get the next task I should work on"

#### **Bulk Operations**
- "Create tasks for all files in /path/to/my/project using this template: [your template]"
- "Use the template file at /path/to/template.md to create tasks for /path/to/tasks folder"
- "Clear all todos and start fresh"

#### **Workflow Examples**
- "Get my next task" (returns Task 1, 2, 3... in sequence)
- "Complete task abc123-def4-5678" (marks as done, next call returns Task 2)
- "Show me a summary of all my active work"

#### **Template System**
The bulk operations support powerful templating with auto-injection:
```markdown
Your template:
Read the task file and complete all steps.
Follow the instructions exactly as written.

Gets auto-expanded to:
**Task 5**
**Task File:** /path/to/file.md
Read the task file and complete all steps.
Follow the instructions exactly as written.
**When completed, use the complete-todo MCP tool:**
- ID: abc123-def4-5678-9012-345678901234
```

## Project Structure

This project follows a clear separation of concerns to make the code easy to understand:

```
src/
├── models/       # Data structures and validation schemas
├── services/     # Business logic and database operations
├── utils/        # Helper functions and formatters
├── config.ts     # Configuration settings
├── client.ts     # Test client for local testing
└── index.ts      # Main entry point with MCP tool definitions
```

## Learning from This Project

This project is designed as an educational resource. To get the most out of it:

1. Read the [GUIDE.md](GUIDE.md) for a comprehensive explanation of the design
2. Study the heavily commented source code to understand implementation details
3. Use the test client to see how the server works in practice
4. Experiment with adding your own tools or extending the existing ones

## Database Schema

The server uses SQLite with the following schema:

```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,              -- UUID
  title TEXT NOT NULL,              -- Task title
  description TEXT NOT NULL,        -- Markdown description (with auto-injected content for bulk tasks)
  completedAt TEXT NULL,            -- ISO timestamp when completed
  createdAt TEXT NOT NULL,          -- ISO timestamp when created
  updatedAt TEXT NOT NULL,          -- ISO timestamp when last updated
  filePath TEXT NULL,               -- Associated file path (for bulk tasks)
  status TEXT NOT NULL DEFAULT 'New', -- Task status: 'New' or 'Done'
  taskNumber INTEGER NULL           -- Sequential task number for ordering
);
```

## Development

### Building

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Testing

```bash
# Test with the included client
npm run test

# Use MCP Inspector for debugging
npm run inspector
```

## Key Features Deep Dive

### **Task Numbering System**
- All tasks get sequential numbers (1, 2, 3...) regardless of creation method
- `get-next-todo` returns lowest numbered incomplete task
- Provides predictable workflow progression

### **Bulk Task Creation**
- Recursively scans folders for all files
- Creates one task per file with auto-injected metadata
- Prevents duplicates by checking existing file paths
- Supports both inline templates and template files

### **Smart Validation**
- Duplicate prevention based on file paths and content
- Template file validation (existence, readability)
- Clear error messages with specific details
- Graceful handling of partial failures

### **Template Auto-Injection**
Templates automatically get enhanced with:
- Task number header
- File path reference
- Completion instructions with todo ID
- Your custom instructions in the middle

## License

MIT