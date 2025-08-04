# Security Setup Guide

## 🚨 CRITICAL: Remove Sensitive Files from Git History

Your repository contains sensitive files with real API keys and passwords. Follow these steps immediately:

### 1. Remove Files from Git History

```bash
# Remove sensitive files from Git history completely
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/task-definition.json" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/src/firebase.js" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/service-definition.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remove from remote repository
git push origin --force --all
git push origin --force --tags
```

### 2. Regenerate Compromised Credentials

**IMMEDIATELY regenerate these credentials:**

1. **OpenAI API Key**: Go to OpenAI dashboard and create a new API key
2. **Database Password**: Change your RDS database password
3. **JWT Secret Key**: Generate a new secret key
4. **Firebase API Key**: Consider regenerating Firebase credentials

### 3. Set Up Environment Variables

#### Backend (.env file)
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/parenting_app

# OpenAI Configuration
OPENAI_API_KEY=your_new_openai_api_key

# JWT Secret Key
SECRET_KEY=your_new_secret_key

# Firebase Configuration
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_PROJECT_ID=your_firebase_project_id
```

#### Frontend (.env file)
```bash
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

### 4. AWS ECS Deployment

For production deployment, use AWS Systems Manager Parameter Store or Secrets Manager:

```bash
# Store secrets in AWS Systems Manager Parameter Store
aws ssm put-parameter --name "/parenting-app/database-url" --value "your_db_url" --type "SecureString"
aws ssm put-parameter --name "/parenting-app/openai-api-key" --value "your_openai_key" --type "SecureString"
aws ssm put-parameter --name "/parenting-app/secret-key" --value "your_secret_key" --type "SecureString"
```

### 5. Template Files

Use the provided template files:
- `backend/task-definition.template.json` - Copy to `task-definition.json` and fill in real values
- `frontend/src/firebase.template.js` - Copy to `firebase.js` and fill in real values

### 6. Security Best Practices

1. **Never commit real credentials to Git**
2. **Use environment variables for all secrets**
3. **Use AWS Secrets Manager or Parameter Store for production**
4. **Regularly rotate API keys and passwords**
5. **Use .gitignore to prevent accidental commits**
6. **Consider using Git hooks to prevent committing sensitive files**

### 7. Verification

After cleanup, verify no sensitive data remains:
```bash
# Search for potential secrets in your repository
grep -r "sk-" .
grep -r "password" .
grep -r "secret" .
```

## Emergency Actions Required

1. **Immediately** regenerate all exposed API keys
2. **Immediately** change database passwords
3. **Immediately** remove files from Git history
4. **Notify** your team about the security breach
5. **Review** all recent commits for other sensitive data 