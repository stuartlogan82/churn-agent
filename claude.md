# Claude Development Guidelines

## Development Approach

### Test Driven Development (TDD)

This project follows a **Test Driven Development** approach. When implementing features:

1. **Write tests first** - Before writing any implementation code, write the tests that define the expected behavior
2. **Run tests** - Verify that tests fail initially (red)
3. **Write minimal code** - Implement just enough code to make the tests pass (green)
4. **Refactor** - Clean up the code while keeping tests passing
5. **Repeat** - Continue this cycle for each new feature or bug fix

### Testing Requirements

- **Unit Tests**: Each service must have unit tests for core functionality
- **Integration Tests**: Test interactions between services
- **Mock External Dependencies**: Mock calls to Salesforce, OpenAI, and 8x8 APIs in tests
- **Test Coverage**: Aim for high test coverage on business logic

### Testing Tools

- **Framework**: Jest (for Node.js services)
- **Assertions**: Jest matchers
- **Mocking**: Jest mock functions for external API calls
- **Test Structure**: Organize tests in `__tests__` directories alongside source code

### Example TDD Workflow

```javascript
// 1. Write the test first
describe('ChurnPredictionService', () => {
  test('should return high risk score for customer with multiple escalated tickets', async () => {
    const mockCustomerData = { /* ... */ };
    const result = await predictChurn(mockCustomerData);
    expect(result.score).toBeGreaterThan(70);
    expect(result.level).toBe('high');
  });
});

// 2. Run test (it will fail)
// 3. Implement the minimum code to pass
// 4. Refactor if needed
// 5. Move to next test
```

## Implementation Guidelines

- Always write tests before implementation code
- Keep tests simple, focused, and readable
- Each test should test one specific behavior
- Use descriptive test names that explain what is being tested
- Run tests frequently during development
- Never commit code with failing tests
