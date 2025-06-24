/**
 * TodoService.ts
 * 
 * This service implements the core business logic for managing todos.
 * It acts as an intermediary between the data model and the database,
 * handling all CRUD operations and search functionality.
 * 
 * WHY A SERVICE LAYER?
 * - Separates business logic from database operations
 * - Provides a clean API for the application to work with
 * - Makes it easier to change the database implementation later
 * - Encapsulates complex operations into simple method calls
 */
import { Todo, createTodo, CreateTodoSchema, UpdateTodoSchema, BulkAddTodosSchema, UpdateStatusSchema } from '../models/Todo.js';
import { z } from 'zod';
import { databaseService } from './DatabaseService.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TodoService Class
 * 
 * This service follows the repository pattern to provide a clean
 * interface for working with todos. It encapsulates all database
 * operations and business logic in one place.
 */
class TodoService {
  /**
   * Create a new todo
   * 
   * This method:
   * 1. Uses the factory function to create a new Todo object
   * 2. Persists it to the database
   * 3. Returns the created Todo
   * 
   * @param data Validated input data (title and description)
   * @returns The newly created Todo
   */
  createTodo(data: z.infer<typeof CreateTodoSchema>, filePath?: string, taskNumber?: number): Todo {
    // Get the database instance
    const db = databaseService.getDb();
    
    // Check for duplicate title and description combination
    const duplicateCheckStmt = db.prepare('SELECT id FROM todos WHERE title = ? AND description = ?');
    const existingTodo = duplicateCheckStmt.get(data.title, data.description) as any;
    
    if (existingTodo) {
      throw new Error(`A todo with the same title and description already exists (ID: ${existingTodo.id})`);
    }
    
    // If no task number provided, get the next available one
    let finalTaskNumber = taskNumber;
    if (finalTaskNumber === undefined) {
      const maxTaskNumberStmt = db.prepare('SELECT MAX(taskNumber) as maxTaskNumber FROM todos');
      const maxResult = maxTaskNumberStmt.get() as any;
      finalTaskNumber = (maxResult?.maxTaskNumber || 0) + 1;
    }
    
    // Use the factory function to create a Todo with proper defaults
    const todo = createTodo(data, filePath, finalTaskNumber);
    
    // Prepare the SQL statement for inserting a new todo
    const stmt = db.prepare(`
      INSERT INTO todos (id, title, description, completedAt, createdAt, updatedAt, filePath, status, taskNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Execute the statement with the todo's data
    stmt.run(
      todo.id,
      todo.title,
      todo.description,
      todo.completedAt,
      todo.createdAt,
      todo.updatedAt,
      todo.filePath,
      todo.status,
      todo.taskNumber
    );
    
    // Return the created todo
    return todo;
  }

  /**
   * Get a todo by ID
   * 
   * This method:
   * 1. Queries the database for a todo with the given ID
   * 2. Converts the database row to a Todo object if found
   * 
   * @param id The UUID of the todo to retrieve
   * @returns The Todo if found, undefined otherwise
   */
  getTodo(id: string): Todo | undefined {
    const db = databaseService.getDb();
    
    // Use parameterized query to prevent SQL injection
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
    const row = stmt.get(id) as any;
    
    // Return undefined if no todo was found
    if (!row) return undefined;
    
    // Convert the database row to a Todo object
    return this.rowToTodo(row);
  }

  /**
   * Get all todos
   * 
   * This method returns all todos in the database without filtering.
   * 
   * @returns Array of all Todos
   */
  getAllTodos(): Todo[] {
    const db = databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM todos');
    const rows = stmt.all() as any[];
    
    // Convert each database row to a Todo object
    return rows.map(row => this.rowToTodo(row));
  }

  /**
   * Get all active (non-completed) todos
   * 
   * This method returns only todos that haven't been marked as completed.
   * A todo is considered active when its completedAt field is NULL.
   * 
   * @returns Array of active Todos
   */
  getActiveTodos(): Todo[] {
    const db = databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM todos WHERE completedAt IS NULL');
    const rows = stmt.all() as any[];
    
    // Convert each database row to a Todo object
    return rows.map(row => this.rowToTodo(row));
  }

  /**
   * Update a todo
   * 
   * This method:
   * 1. Checks if the todo exists
   * 2. Updates the specified fields
   * 3. Returns the updated todo
   * 
   * @param data The update data (id required, title/description optional)
   * @returns The updated Todo if found, undefined otherwise
   */
  updateTodo(data: z.infer<typeof UpdateTodoSchema>): Todo | undefined {
    // First check if the todo exists
    const todo = this.getTodo(data.id);
    if (!todo) return undefined;

    // Create a timestamp for the update
    const updatedAt = new Date().toISOString();
    
    const db = databaseService.getDb();
    const stmt = db.prepare(`
      UPDATE todos
      SET title = ?, description = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    // Update with new values or keep existing ones if not provided
    stmt.run(
      data.title || todo.title,
      data.description || todo.description,
      updatedAt,
      todo.id
    );
    
    // Return the updated todo
    return this.getTodo(todo.id);
  }

  /**
   * Mark a todo as completed
   * 
   * This method:
   * 1. Checks if the todo exists
   * 2. Sets the completedAt timestamp to the current time
   * 3. Returns the updated todo
   * 
   * @param id The UUID of the todo to complete
   * @returns The updated Todo if found, undefined otherwise
   */
  completeTodo(id: string): Todo | undefined {
    // First check if the todo exists
    const todo = this.getTodo(id);
    if (!todo) return undefined;

    // Create a timestamp for the completion and update
    const now = new Date().toISOString();
    
    const db = databaseService.getDb();
    const stmt = db.prepare(`
      UPDATE todos
      SET completedAt = ?, updatedAt = ?, status = 'Done'
      WHERE id = ?
    `);
    
    // Set the completedAt timestamp and status to Done
    stmt.run(now, now, id);
    
    // Return the updated todo
    return this.getTodo(id);
  }

  /**
   * Delete a todo
   * 
   * This method removes a todo from the database permanently.
   * 
   * @param id The UUID of the todo to delete
   * @returns true if deleted, false if not found or not deleted
   */
  deleteTodo(id: string): boolean {
    const db = databaseService.getDb();
    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(id);
    
    // Check if any rows were affected
    return result.changes > 0;
  }

  /**
   * Search todos by title
   * 
   * This method performs a case-insensitive partial match search
   * on todo titles.
   * 
   * @param title The search term to look for in titles
   * @returns Array of matching Todos
   */
  searchByTitle(title: string): Todo[] {
    // Add wildcards to the search term for partial matching
    const searchTerm = `%${title}%`;
    
    const db = databaseService.getDb();
    
    // COLLATE NOCASE makes the search case-insensitive
    const stmt = db.prepare('SELECT * FROM todos WHERE title LIKE ? COLLATE NOCASE');
    const rows = stmt.all(searchTerm) as any[];
    
    return rows.map(row => this.rowToTodo(row));
  }

  /**
   * Search todos by date
   * 
   * This method finds todos created on a specific date.
   * It matches the start of the ISO string with the given date.
   * 
   * @param dateStr The date to search for in YYYY-MM-DD format
   * @returns Array of matching Todos
   */
  searchByDate(dateStr: string): Todo[] {
    // Add wildcard to match the time portion of ISO string
    const datePattern = `${dateStr}%`;
    
    const db = databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM todos WHERE createdAt LIKE ?');
    const rows = stmt.all(datePattern) as any[];
    
    return rows.map(row => this.rowToTodo(row));
  }

  /**
   * Generate a summary of active todos
   * 
   * This method creates a markdown-formatted summary of all active todos.
   * 
   * WHY RETURN FORMATTED STRING?
   * - Provides ready-to-display content for the MCP client
   * - Encapsulates formatting logic in the service
   * - Makes it easy for LLMs to present a readable summary
   * 
   * @returns Markdown-formatted summary string
   */
  summarizeActiveTodos(): string {
    const activeTodos = this.getActiveTodos();
    
    // Handle the case when there are no active todos
    if (activeTodos.length === 0) {
      return "No active todos found.";
    }
    
    // Create a bulleted list of todo titles
    const summary = activeTodos.map(todo => `- ${todo.title}`).join('\n');
    return `# Active Todos Summary\n\nThere are ${activeTodos.length} active todos:\n\n${summary}`;
  }
  
  /**
   * Helper to convert a database row to a Todo object
   * 
   * This private method handles the conversion between the database
   * representation and the application model.
   * 
   * WHY SEPARATE THIS LOGIC?
   * - Avoids repeating the conversion code in multiple methods
   * - Creates a single place to update if the model changes
   * - Isolates database-specific knowledge from the rest of the code
   * 
   * @param row The database row data
   * @returns A properly formatted Todo object
   */
  private rowToTodo(row: any): Todo {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completedAt: row.completedAt,
      completed: row.completedAt !== null, // Computed from completedAt
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      filePath: row.filePath,
      status: row.status || 'New',
      taskNumber: row.taskNumber
    };
  }

  /**
   * Validate file paths for duplicate detection
   * 
   * @param filePaths Array of file paths to validate (already verified to exist)
   * @param db Database connection
   * @returns Validation results with valid files and duplicates
   */
  private validateFilePaths(filePaths: string[], db: any): {
    validFiles: string[];
    duplicates: string[];
  } {
    const validFiles: string[] = [];
    const duplicates: string[] = [];
    
    // Get all existing file paths from database
    const existingFilePathsStmt = db.prepare('SELECT filePath FROM todos WHERE filePath IS NOT NULL');
    const existingRows = existingFilePathsStmt.all() as any[];
    const existingFilePaths = new Set(existingRows.map(row => row.filePath));
    
    for (const filePath of filePaths) {
      // Check if file already has a task
      if (existingFilePaths.has(filePath)) {
        duplicates.push(filePath);
        continue;
      }
      
      // File is valid
      validFiles.push(filePath);
    }
    
    return { validFiles, duplicates };
  }

  /**
   * Recursively get all files in a directory
   * 
   * @param dirPath The directory path to scan
   * @returns Array of absolute file paths
   */
  private getAllFilesRecursively(dirPath: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...this.getAllFilesRecursively(fullPath));
        } else if (entry.isFile()) {
          // Add file to list
          files.push(fullPath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return files;
  }

  /**
   * Bulk add todos with auto-injected fields from folder
   * 
   * This method:
   * 1. Recursively scans the provided folder for all files
   * 2. Creates one todo per file with auto-injected task info
   * 3. Auto-injects: Task number header, file path, and completion instruction with todo ID
   * 
   * @param data The bulk add data (folderPath and template)
   * @returns Array of created Todos
   */
  bulkAddTodos(data: z.infer<typeof BulkAddTodosSchema>): Todo[] {
    const { folderPath, template, templateFilePath } = data;
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }
    
    if (!fs.statSync(folderPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${folderPath}`);
    }
    
    // Determine the template to use
    let finalTemplate: string;
    if (templateFilePath) {
      // Read template from file
      if (!fs.existsSync(templateFilePath)) {
        throw new Error(`Template file does not exist: ${templateFilePath}`);
      }
      
      if (!fs.statSync(templateFilePath).isFile()) {
        throw new Error(`Template path is not a file: ${templateFilePath}`);
      }
      
      try {
        finalTemplate = fs.readFileSync(templateFilePath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to read template file ${templateFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      if (!finalTemplate.trim()) {
        throw new Error(`Template file is empty: ${templateFilePath}`);
      }
    } else if (template) {
      // Use provided inline template
      finalTemplate = template;
    } else {
      // This shouldn't happen due to schema validation, but just in case
      throw new Error('Either template or templateFilePath must be provided');
    }
    
    // Get all files recursively
    const allFilePaths = this.getAllFilesRecursively(folderPath);
    
    if (allFilePaths.length === 0) {
      throw new Error(`No files found in directory: ${folderPath}`);
    }
    
    // Get database connection for validation
    const db = databaseService.getDb();
    
    // Filter out duplicate file paths (files that already have tasks)
    const validationResults = this.validateFilePaths(allFilePaths, db);
    const filePaths = validationResults.validFiles;
    
    if (filePaths.length === 0) {
      throw new Error(`No valid files to process. ${validationResults.duplicates.length} files already have tasks.`);
    }
    
    // Log validation summary if there were duplicates
    if (validationResults.duplicates.length > 0) {
      console.warn(`Validation summary: Processing ${filePaths.length} files, skipped ${validationResults.duplicates.length} duplicates`);
    }
    
    // Get the highest existing task number to continue numbering from there
    const maxTaskNumberStmt = db.prepare('SELECT MAX(taskNumber) as maxTaskNumber FROM todos');
    const maxResult = maxTaskNumberStmt.get() as any;
    const startingTaskNumber = (maxResult?.maxTaskNumber || 0) + 1;
    
    const createdTodos: Todo[] = [];

    filePaths.forEach((filePath, index) => {
      const taskNumber = startingTaskNumber + index;
      
      // Create todo with temporary description (will be updated after todo creation with ID)
      const todoData = {
        title: `Task ${taskNumber}`,
        description: finalTemplate
      };

      const todo = createTodo(todoData, filePath, taskNumber);
      
      // Auto-inject task information into the description
      const processedDescription = `**Task ${taskNumber}**

**Task File:** ${filePath}

${finalTemplate}

**When completed, use the complete-todo MCP tool:**
- ID: ${todo.id}`;

      // Update the todo with the processed description
      todo.description = processedDescription;
      
      // Save to database
      const db = databaseService.getDb();
      const stmt = db.prepare(`
        INSERT INTO todos (id, title, description, completedAt, createdAt, updatedAt, filePath, status, taskNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        todo.id,
        todo.title,
        todo.description,
        todo.completedAt,
        todo.createdAt,
        todo.updatedAt,
        todo.filePath,
        todo.status,
        todo.taskNumber
      );

      createdTodos.push(todo);
    });

    return createdTodos;
  }

  /**
   * Update todo status
   * 
   * @param data The status update data (id and status)
   * @returns The updated Todo if found, undefined otherwise
   */
  updateStatus(data: z.infer<typeof UpdateStatusSchema>): Todo | undefined {
    const todo = this.getTodo(data.id);
    if (!todo) return undefined;

    const updatedAt = new Date().toISOString();
    
    const db = databaseService.getDb();
    const stmt = db.prepare(`
      UPDATE todos
      SET status = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(data.status, updatedAt, data.id);
    
    return this.getTodo(data.id);
  }

  /**
   * Get next todo that is not marked as 'Done'
   * 
   * @returns The next Todo that needs to be completed, undefined if none
   */
  getNextTodo(): Todo | undefined {
    const db = databaseService.getDb();
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE status != 'Done' 
      ORDER BY taskNumber ASC
      LIMIT 1
    `);
    const row = stmt.get() as any;
    
    if (!row) return undefined;
    
    return this.rowToTodo(row);
  }

  /**
   * Clear all todos from the database
   * 
   * @returns Number of todos deleted
   */
  clearAllTodos(): number {
    const db = databaseService.getDb();
    const stmt = db.prepare('DELETE FROM todos');
    const result = stmt.run();
    
    return result.changes;
  }
}

// Create a singleton instance for use throughout the application
export const todoService = new TodoService(); 