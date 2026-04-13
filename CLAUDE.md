## claude-learn (auto-generated — do not edit this section)

When you detect any of the following situations during this session, call the `log_learning_point` MCP tool:

1. **terminology**: The user used an ambiguous or incorrect expression, and you inferred the correct technical term.
   - Example: user says "코드 합치기" → you used "merge (병합)"
2. **keyword**: A new development concept, technology, or pattern was introduced for the first time in this project.
   - Example: you introduced "bcrypt" for password hashing
3. **error_learning**: An error occurred, and you explained the root cause with development concepts.
   - Example: Supabase RLS blocking queries → explained Row Level Security

Rules:
- Do NOT log trivial things like variable names, import statements, file creation, or basic syntax.
- Only log concepts that a non-developer would benefit from learning.
- Include the category path (e.g. "Backend > Authentication") for mindmap organization.
- Always provide the explanation in Korean.
- Do not interrupt the user's workflow. Respond normally and log in the background.
- Use project_name: "stock-list-extract" for all log_learning_point calls.
