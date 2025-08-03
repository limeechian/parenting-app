# Lambda Build Guide

This guide explains the different build options available for creating AWS Lambda deployment packages.

## Build Options

### 1. Full Build (`build.bat`)
- **Package**: `parenting-app-lambda.zip` (~73MB)
- **Requirements**: `requirements-lambda.txt`
- **Use Case**: Complete backend with all features
- **Issues**: Large size, dependency conflicts

### 2. Optimized Build (`build-optimized.bat`)
- **Package**: `parenting-app-lambda-optimized.zip` (~15-25MB expected)
- **Requirements**: `requirements-lambda-optimized.txt`
- **Use Case**: Full features with reduced size
- **Benefits**: Resolves dependency conflicts, removes unused packages

### 3. Minimal Build (`build-minimal.bat`)
- **Package**: `parenting-app-lambda-minimal.zip` (~5-10MB expected)
- **Requirements**: `requirements-lambda-minimal.txt`
- **Use Case**: Basic functionality only
- **Benefits**: Fastest cold start, smallest size

## Dependency Analysis

### Issues in Current Build
1. **Version Conflicts**:
   - `langchain-core`: 0.1.23 vs 0.3.51 required
   - `tiktoken`: 0.5.2 vs 0.7.0 required
   - `botocore`: 1.40.0 vs 1.39.17 required

2. **Yanked Package**:
   - `langchain-community==0.0.9` (bad imports)

3. **Unused Dependencies**:
   - `alembic` (database migrations)
   - `google-auth` (not used in Lambda)
   - `langchain` (full package)
   - `langchain-community` (yanked version)

### Optimized Dependencies
The optimized build includes only:
- Core FastAPI and web framework
- Database components (SQLAlchemy, PostgreSQL)
- Authentication (FastAPI Users)
- AI components (LangChain OpenAI, CrewAI)
- Essential utilities

### Minimal Dependencies
The minimal build includes only:
- FastAPI core
- Mangum (Lambda adapter)
- Pydantic (data validation)
- Python-dotenv (environment)
- Basic utilities

## Usage

### For Development/Testing
```bash
# Use minimal build for fast iteration
build-minimal.bat
```

### For Production (Full Features)
```bash
# Use optimized build for production
build-optimized.bat
```

### For Complete Backend
```bash
# Use full build (if you need all features)
build.bat
```

## Package Size Comparison

| Build Type | Expected Size | Cold Start | Features |
|------------|---------------|------------|----------|
| Minimal | 5-10 MB | Fastest | Basic endpoints only |
| Optimized | 15-25 MB | Fast | Full features, no conflicts |
| Full | 73 MB | Slow | All features, some conflicts |

## Recommendations

1. **Start with Minimal**: Use minimal build for development and testing
2. **Use Optimized for Production**: Provides full features with better performance
3. **Avoid Full Build**: Only use if you specifically need all dependencies

## Troubleshooting

### Dependency Conflicts
If you encounter dependency conflicts:
1. Use the optimized build instead
2. Check the requirements files for compatible versions
3. Consider removing unused dependencies

### Package Too Large
If the package is too large:
1. Use the minimal build
2. Check for unnecessary files in the build directory
3. Remove unused dependencies from requirements

### Cold Start Issues
To improve cold start performance:
1. Use minimal build for basic functionality
2. Implement lazy loading (already done in optimized function)
3. Consider using Lambda layers for common dependencies 