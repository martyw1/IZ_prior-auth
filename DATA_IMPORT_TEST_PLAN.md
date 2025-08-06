# Data Import Test Plan - MedAuth Pro

## Overview
Comprehensive testing plan for the Data Import functionality to ensure reliable patient record processing, duplicate detection, and error handling for medical practice data volumes.

## Test Environment Setup

### Prerequisites
- MedAuth Pro application running with admin/doctor/staff access
- Database connection established
- CSV test files prepared with various scenarios
- Monitor console logs and workflow output during testing

## Phase 1: Database Schema Validation

### Test 1.1: Schema Verification
**Objective**: Ensure all patient table columns exist for insurance and PCP data
**Steps**:
1. Verify database schema includes new columns:
   - `primary_insurance_provider` (text)
   - `policy_number` (text)
   - `member_id` (text)
   - `group_number` (text)
   - `insurance_effective_date` (timestamp)
   - `insurance_expiration_date` (timestamp)
   - `pcp_name` (text)
   - `pcp_npi` (text)
   - `pcp_phone` (text)
   - `pcp_address` (text)
2. Run database migration if columns missing
3. Verify existing patient records still accessible

**Expected Result**: All columns present, no database errors

## Phase 2: CSV File Format Testing

### Test 2.1: Standard CSV Format
**Objective**: Test import with properly formatted CSV file
**Test File**: Create `test_standard_import.csv` with:
```csv
Id,FIRST,LAST,BIRTHDATE,GENDER,ADDRESS,primaryInsuranceProvider,memberId,policyNumber,pcpName,pcpNpi
TEST-001,John,Doe,1980-01-15,M,"123 Main St, City, ST 12345",Blue Cross Blue Shield,MEM123456,POL789012,Dr. Smith,1234567890
TEST-002,Jane,Smith,1975-05-20,F,"456 Oak Ave, Town, ST 54321",Aetna,MEM654321,POL345678,Dr. Johnson,0987654321
```

**Steps**:
1. Navigate to Data Import → Patient Records
2. Upload test_standard_import.csv
3. Monitor processing progress
4. Verify import results show success count
5. Check imported patients appear in patient list with all data

**Expected Result**: 2 patients imported successfully with all fields populated

### Test 2.2: Large Volume CSV
**Objective**: Test system handling of typical medical practice volumes
**Test File**: Create `test_large_volume.csv` with 500+ patient records
**Steps**:
1. Upload large CSV file
2. Monitor memory usage and processing time
3. Verify batch processing works (20-record batches)
4. Check timeout handling (should not hang)
5. Verify all records processed within reasonable time (< 30 seconds)

**Expected Result**: All records processed efficiently without hanging

### Test 2.3: Invalid Data Handling
**Objective**: Test error handling with malformed data
**Test File**: Create `test_invalid_data.csv` with:
- Missing required fields (FIRST, LAST, BIRTHDATE)
- Invalid date formats
- Invalid NPI numbers (not 10 digits)
- Special characters in names

**Steps**:
1. Upload invalid data CSV
2. Monitor error reporting
3. Verify system continues processing valid records
4. Check detailed error messages for invalid records

**Expected Result**: Valid records imported, invalid records reported with specific errors

## Phase 3: Duplicate Detection Testing

### Test 3.1: Exact Duplicate Detection
**Objective**: Test duplicate detection by patient ID
**Test File**: Create CSV with duplicate patient IDs
**Steps**:
1. Import initial CSV with patient TEST-001
2. Import second CSV with same patient ID TEST-001
3. Verify duplicate detection triggers
4. Check update options presented to user
5. Test both "skip" and "update" options

**Expected Result**: Duplicate detected, user prompted with update options

### Test 3.2: Name/DOB Duplicate Detection
**Objective**: Test duplicate detection by name and date of birth
**Test File**: Create CSV with same name/DOB but different patient ID
**Steps**:
1. Import patient "John Doe" born 1980-01-15 with ID TEST-001
2. Import patient "John Doe" born 1980-01-15 with ID TEST-002
3. Verify duplicate detection by name/DOB combination
4. Test update decision workflow

**Expected Result**: Duplicate detected by name/DOB, proper handling options

## Phase 4: Data Integrity Testing

### Test 4.1: Insurance Data Import
**Objective**: Verify comprehensive insurance data import
**Test File**: CSV with complete insurance information
**Steps**:
1. Import patients with all insurance fields populated
2. Verify insurance provider names imported correctly
3. Check member IDs, policy numbers, group numbers
4. Validate date fields for effective/expiration dates
5. Confirm data appears in patient edit forms

**Expected Result**: All insurance data imported and accessible in patient forms

### Test 4.2: PCP Data Import
**Objective**: Verify Primary Care Provider data import
**Test File**: CSV with PCP information including NPI validation
**Steps**:
1. Import patients with PCP data (name, NPI, phone, address)
2. Verify NPI validation (10-digit requirement)
3. Check PCP data appears in patient records
4. Test both valid and invalid NPI formats

**Expected Result**: Valid PCP data imported, invalid NPI rejected with error

## Phase 5: Progress Tracking & Session Persistence

### Test 5.1: Progress Monitoring
**Objective**: Test real-time progress tracking during import
**Steps**:
1. Upload medium-size CSV (100+ records)
2. Monitor progress bar updates
3. Verify batch processing indicators
4. Check completion status reporting
5. Verify final import summary accuracy

**Expected Result**: Accurate progress tracking throughout import process

### Test 5.2: Session Persistence
**Objective**: Test import state persistence across navigation
**Steps**:
1. Start large CSV import
2. Navigate away from Data Import page during processing
3. Return to Data Import page
4. Verify import progress/results still displayed
5. Test "Clear State" functionality

**Expected Result**: Import state persists, clear state resets properly

## Phase 6: Error Recovery Testing

### Test 6.1: Network Interruption
**Objective**: Test behavior during network issues
**Steps**:
1. Start CSV import process
2. Simulate network interruption (disconnect briefly)
3. Verify error handling and recovery
4. Check partial results handling

**Expected Result**: Graceful error handling, partial results preserved

### Test 6.2: Large File Memory Management
**Objective**: Test handling of very large CSV files
**Test File**: Create CSV with 1000+ patient records
**Steps**:
1. Upload very large CSV file
2. Monitor memory usage during processing
3. Verify no memory leaks or crashes
4. Check processing completion

**Expected Result**: Stable processing of large files without memory issues

## Phase 7: Audit Trail Verification

### Test 7.1: Import Activity Logging
**Objective**: Verify all import activities logged for HIPAA compliance
**Steps**:
1. Perform various import operations
2. Check Audit Trail page for import entries
3. Verify logged information includes:
   - User ID performing import
   - Timestamp of operations
   - Number of records processed
   - Import source (CSV filename)
   - Success/failure status

**Expected Result**: Complete audit trail of all import activities

## Success Criteria

### Performance Benchmarks
- Import 100 records in < 10 seconds
- Import 500 records in < 30 seconds
- Import 1000 records in < 60 seconds
- No memory leaks during large imports
- No system hangs or timeouts

### Data Integrity Requirements
- 100% accuracy for valid data import
- Proper error reporting for invalid data
- Complete audit trail for all operations
- Duplicate detection accuracy > 99%
- Insurance and PCP data fully preserved

### User Experience Standards
- Clear progress indicators throughout process
- Intuitive error messages for import issues
- Session state persistence across navigation
- Easy access to import results and logs

## Known Issues to Address

### Current Database Schema Issue
- Error: "column 'primary_insurance_provider' does not exist"
- Fix: Run database migration to add new insurance/PCP columns
- Test: Verify all new columns created properly

### Import Hanging Issue
- Symptom: CSV processing appears to hang on large files
- Cause: Database query timeouts on duplicate checking
- Fix: Optimize batch processing and query performance
- Test: Confirm no hanging with large file imports

## Test Execution Schedule

1. **Phase 1-2**: Database and basic CSV testing (30 minutes)
2. **Phase 3-4**: Duplicate detection and data integrity (45 minutes)
3. **Phase 5-6**: Progress tracking and error recovery (30 minutes)
4. **Phase 7**: Audit trail verification (15 minutes)

**Total Estimated Time**: 2 hours for comprehensive testing

## Post-Test Documentation

### Test Results Template
For each test, document:
- Test executed: [Date/Time]
- Result: [Pass/Fail]
- Issues found: [Description]
- Performance metrics: [Time, memory usage]
- Recommendations: [Improvements needed]

### Bug Report Template
- Issue: [Description]
- Steps to reproduce: [Detailed steps]
- Expected result: [What should happen]
- Actual result: [What actually happened]
- Severity: [High/Medium/Low]
- Priority: [Immediate/High/Medium/Low]