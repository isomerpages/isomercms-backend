const { lock, unlock } = require('../utils/mutex-utils')
const REPO_NAME = 'test-repo-name'

describe('Mutex utils test', () => {
  beforeEach(() => {
    // Suppress console logs and errors for this test suite
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeAll(async () => {
    await unlock(REPO_NAME)
  })

  it('should lock repo successfully', async () => {
    await expect(lock(REPO_NAME)).resolves.not.toThrowError()
  })

  it('should not allow locking of a locked repo', async () => {
    await expect(lock(REPO_NAME)).rejects.toThrowError()
  })

  it('should unlock a locked repo successfully', async () => {
    await expect(unlock(REPO_NAME)).resolves.not.toThrowError()
  })
});