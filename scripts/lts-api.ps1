# LTS API Helper Functions
# Base URL: https://lts-dev-server.zealstudiojsc.com
# Token: session-only (RAM), khong persist ra disk
# Bao mat: khong echo password/token ra output
#
# Usage:
#   . C:\Users\PC\AppData\Local\Temp\opencode\lts-api.ps1
#   $session = Connect-Lts -Account "admin" -Password "<password>"
#   Get-LtsActivityLogs -Session $session
#
# Moi Bash tool call la 1 process rieng -> phai Connect-Lts lai trong cung call.

$script:LtsBaseUrl = "https://lts-dev-server.zealstudiojsc.com"

# ============================================================================
# CORE: Session & HTTP wrapper
# ============================================================================

function Connect-Lts {
    <#
    .SYNOPSIS
        Dang nhap LTS API, tra ve session object chua accessToken + thong tin user.
    .PARAMETER Account
        Username (vd: "admin")
    .PARAMETER Password
        Plain-text password (khong duoc log/echo)
    .OUTPUTS
        PSCustomObject: { accessToken, refreshToken, account, fullName, active, exp }
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Account,

        [Parameter(Mandatory = $true)]
        [string]$Password
    )

    $body = @{
        account  = $Account
        password = $Password
    } | ConvertTo-Json -Compress

    try {
        $resp = Invoke-RestMethod -Uri "$script:LtsBaseUrl/auth/login" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop

        $session = [PSCustomObject]@{
            accessToken  = $resp.accessToken
            refreshToken = $resp.refreshToken
            account      = $resp.account
            fullName     = $resp.fullName
            active       = $resp.active
            exp          = $null
        }

        if ($resp.accessToken) {
            $parts = $resp.accessToken.Split('.')
            if ($parts.Count -ge 2) {
                $payloadB64 = $parts[1]
                $padLen = 4 - ($payloadB64.Length % 4)
                if ($padLen -lt 4) { $payloadB64 += ('=' * $padLen) }
                $payloadB64 = $payloadB64.Replace('-', '+').Replace('_', '/')
                try {
                    $payloadJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadB64))
                    $payload = $payloadJson | ConvertFrom-Json
                    $session.exp = $payload.exp
                } catch { }
            }
        }

        return $session
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        throw "Login failed (HTTP $statusCode): $($_.Exception.Message)"
    }
}

function Disconnect-Lts {
    <#
    .SYNOPSIS
        Xoa session khoi RAM (gan $null). Token khong con su dung duoc.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Session
    )
    $Session.accessToken = $null
    $Session.refreshToken = $null
    Write-Output "Session cleared. Token da xoa khoi RAM."
}

function Test-LtsTokenExpired {
    <#
    .SYNOPSIS
        Kiem tra access token co het han chua ( dua vao exp trong JWT).
    .OUTPUTS
        bool: $true neu het han, $false neu con han.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Session
    )

    if (-not $Session.exp) { return $false }
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    return ($now -ge $Session.exp)
}

function Invoke-Lts {
    <#
    .SYNOPSIS
        Goi LTS API voi access token tu session. Wrapper cho Invoke-RestMethod.
    .PARAMETER Session
        Object tra ve tu Connect-Lts
    .PARAMETER Method
        HTTP method: GET, POST, PATCH, PUT, DELETE
    .PARAMETER Path
        Path bat dau bang / (vd: /activity-logs)
    .PARAMETER Body
        Object hoac JSON string (POST/PATCH/PUT)
    .PARAMETER Query
        Hashtable query params (vd: @{ limit = 10; page = 1 })
    .OUTPUTS
        Response tu API (PSCustomObject hoac array)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Session,

        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PATCH', 'PUT', 'DELETE')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter()]
        $Body,

        [Parameter()]
        [hashtable]$Query
    )

    if (Test-LtsTokenExpired -Session $Session) {
        throw "Access token da het han. Vui long login lai bang Connect-Lts."
    }

    $url = "$script:LtsBaseUrl$Path"
    if ($Query -and $Query.Count -gt 0) {
        $qs = ($Query.GetEnumerator() | ForEach-Object { "$($_.Key)=$([Uri]::EscapeDataString($_.Value))" }) -join '&'
        $url = "${url}?${qs}"
    }

    $headers = @{
        Authorization = "Bearer $($Session.accessToken)"
        accept        = "*/*"
    }

    $params = @{
        Uri         = $url
        Method      = $Method
        Headers     = $headers
        ErrorAction = "Stop"
    }

    if ($Body) {
        if ($Body -is [string]) {
            $params.Body = $Body
        } else {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        $params.ContentType = "application/json"
    }

    try {
        return (Invoke-RestMethod @params)
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            throw "HTTP 401 Unauthorized: Token het han hoac khong hop le. Login lai bang Connect-Lts."
        }
        throw "HTTP $statusCode khi goi $Method $Path : $($_.Exception.Message)"
    }
}

function Show-LtsSession {
    <#
    .SYNOPSIS
        Hien thi thong tin session (KHONG hien thi token/password).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Session
    )

    $expStr = "unknown"
    if ($Session.exp) {
        $expDate = [DateTimeOffset]::FromUnixTimeSeconds($Session.exp).LocalDateTime
        $expStr = $expDate.ToString("yyyy-MM-dd HH:mm:ss")
    }

    Write-Output "=== LTS Session ==="
    Write-Output "Account:  $($Session.account)"
    Write-Output "FullName: $($Session.fullName)"
    Write-Output "Active:   $($Session.active)"
    Write-Output "Exp:      $expStr"
    Write-Output "Token:    [hidden for security]"
}

# ============================================================================
# AUTH: /auth/*
# ============================================================================

function Change-LtsMyPassword {
    <#
    .SYNOPSIS
        PATCH /auth/me/password — Doi mat khau cua account dang dang nhap.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CurrentPassword,
        [Parameter(Mandatory = $true)] [string]$NewPassword
    )
    $body = @{
        currentPassword = $CurrentPassword
        newPassword     = $NewPassword
    }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/auth/me/password" -Body $body
}

function Update-LtsAccountPassword {
    <#
    .SYNOPSIS
        PATCH /auth/{userId}/password — Cap nhat mat khau cho account khac (can policy).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$UserId,
        [Parameter(Mandatory = $true)] [string]$NewPassword
    )
    $body = @{ newPassword = $NewPassword }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/auth/$UserId/password" -Body $body
}

function Get-LtsAccounts {
    <#
    .SYNOPSIS
        GET /auth/accounts — List non-system accounts with granted policies.
    .PARAMETER Name
        Optional prefix filter cho account hoac fullName (vd "john" hoac "john%").
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter()] [string]$Name
    )
    $query = if ($Name) { @{ name = $Name } } else { $null }
    return Invoke-Lts -Session $Session -Method GET -Path "/auth/accounts" -Query $query
}

function New-LtsAccount {
    <#
    .SYNOPSIS
        POST /auth/accounts — Tao account moi.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Account,
        [Parameter(Mandatory = $true)] [string]$Password,
        [Parameter(Mandatory = $true)] [string]$FullName
    )
    $body = @{
        account  = $Account
        password = $Password
        fullName = $FullName
    }
    return Invoke-Lts -Session $Session -Method POST -Path "/auth/accounts" -Body $body
}

function Set-LtsAccountActivation {
    <#
    .SYNOPSIS
        PATCH /auth/accounts/{id}/activate — Kich hoat / vo hieu hoa account.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter(Mandatory = $true)] [bool]$IsActive
    )
    $body = @{ isActive = $IsActive }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/auth/accounts/$Id/activate" -Body $body
}

function Get-LtsRoles {
    <#
    .SYNOPSIS
        GET /auth/roles — List roles with grantor and policies.
    .PARAMETER Name
        Optional prefix filter cho role code hoac name.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter()] [string]$Name
    )
    $query = if ($Name) { @{ name = $Name } } else { $null }
    return Invoke-Lts -Session $Session -Method GET -Path "/auth/roles" -Query $query
}

function Set-LtsRole {
    <#
    .SYNOPSIS
        PUT /auth/roles — Tao hoac cap nhat role (upsert).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Code,
        [Parameter(Mandatory = $true)] [string]$Name,
        [Parameter(Mandatory = $true)] [string]$Description,
        [Parameter(Mandatory = $true)] [string[]]$PolicyCodes
    )
    $body = @{
        code        = $Code
        name        = $Name
        description = $Description
        policyCodes = @($PolicyCodes)
    }
    return Invoke-Lts -Session $Session -Method PUT -Path "/auth/roles" -Body $body
}

function Remove-LtsRole {
    <#
    .SYNOPSIS
        DELETE /auth/roles/{code} — Xoa role.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Code
    )
    return Invoke-Lts -Session $Session -Method DELETE -Path "/auth/roles/$Code"
}

# ============================================================================
# POLICIES: /policies/*
# ============================================================================

function Get-LtsPolicies {
    <#
    .SYNOPSIS
        GET /policies — List available auth policies.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/policies"
}

function Grant-LtsAccountPolicies {
    <#
    .SYNOPSIS
        POST /policies/accounts/{id} — Grant policies cho account.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter(Mandatory = $true)] [string[]]$PolicyCodes
    )
    $body = @{ policyCodes = @($PolicyCodes) }
    return Invoke-Lts -Session $Session -Method POST -Path "/policies/accounts/$Id" -Body $body
}

function Revoke-LtsAccountPolicies {
    <#
    .SYNOPSIS
        DELETE /policies/accounts/{id} — Revoke policies khoi account.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter(Mandatory = $true)] [string[]]$PolicyCodes
    )
    $body = @{ policyCodes = @($PolicyCodes) }
    return Invoke-Lts -Session $Session -Method DELETE -Path "/policies/accounts/$Id" -Body $body
}

# ============================================================================
# CUSTOMERS: /customers/*
# ============================================================================

function Get-LtsCustomers {
    <#
    .SYNOPSIS
        GET /customers — List customers with versions.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/customers"
}

function New-LtsCustomer {
    <#
    .SYNOPSIS
        POST /customers — Tao customer moi (chi can codeName, sau do update version).
    .PARAMETER CodeName
        Unique code name, pattern: ^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$ (vd: ACME_01)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName
    )
    $body = @{ codeName = $CodeName }
    return Invoke-Lts -Session $Session -Method POST -Path "/customers" -Body $body
}

function Get-LtsCustomer {
    <#
    .SYNOPSIS
        GET /customers/{codeName} — Lay customer theo code name.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/customers/$CodeName"
}

function Update-LtsCustomer {
    <#
    .SYNOPSIS
        PATCH /customers/{codeName} — Them version moi cho customer (cap nhat thong tin).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName,
        [Parameter(Mandatory = $true)] [string]$OrganizationName,
        [Parameter(Mandatory = $true)] [string]$ContactName,
        [Parameter(Mandatory = $true)] [string]$PhoneNumber,
        [Parameter(Mandatory = $true)] [string]$Email,
        [Parameter(Mandatory = $true)] [string]$Address,
        [Parameter()] [string]$TaxCode,
        [Parameter()] [string]$Status,
        [Parameter()] [string]$ChangeNote
    )
    $body = @{
        organizationName = $OrganizationName
        contactName      = $ContactName
        phoneNumber      = $PhoneNumber
        email            = $Email
        address          = $Address
    }
    if ($TaxCode)    { $body.taxCode = $TaxCode }
    if ($Status)     { $body.status = $Status }
    if ($ChangeNote) { $body.changeNote = $ChangeNote }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/customers/$CodeName" -Body $body
}

function Get-LtsCustomerManagers {
    <#
    .SYNOPSIS
        GET /customers/{codeName}/managers — List managers cua customer.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/customers/$CodeName/managers"
}

function Set-LtsCustomerManagers {
    <#
    .SYNOPSIS
        PUT /customers/{codeName}/managers — Replace managers cua customer.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName,
        [Parameter(Mandatory = $true)] [string[]]$ManagerIds
    )
    $body = @{ managerIds = @($ManagerIds) }
    return Invoke-Lts -Session $Session -Method PUT -Path "/customers/$CodeName/managers" -Body $body
}

function Get-LtsCustomerLatestVersion {
    <#
    .SYNOPSIS
        GET /customers/{codeName}/versions/latest — Lay version moi nhat cua customer.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/customers/$CodeName/versions/latest"
}

function Get-LtsCustomerVersion {
    <#
    .SYNOPSIS
        GET /customers/{codeName}/versions/{versionId} — Lay version cu the cua customer.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CodeName,
        [Parameter(Mandatory = $true)] [string]$VersionId
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/customers/$CodeName/versions/$VersionId"
}

# ============================================================================
# PRICING SHEET: /pricing-sheet/*
# ============================================================================

function Get-LtsPricingSheets {
    <#
    .SYNOPSIS
        GET /pricing-sheet — List pricing sheets cho managed customers.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/pricing-sheet"
}

function New-LtsPricingSheet {
    <#
    .SYNOPSIS
        POST /pricing-sheet — Tao pricing sheet moi.
    .PARAMETER InputValue
        Object payload tu frontend (pricing input).
    .PARAMETER SaleResult
        Optional object sales result payload.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$PricingSheetName,
        [Parameter(Mandatory = $true)] [string]$CustomerCodeName,
        [Parameter(Mandatory = $true)] $InputValue,
        [Parameter()] [string]$QuotationId,
        [Parameter()] $SaleResult,
        [Parameter()] [string]$Note
    )
    $body = @{
        pricingSheetName  = $PricingSheetName
        customerCodeName  = $CustomerCodeName
        inputValue        = $InputValue
    }
    if ($QuotationId) { $body.quotationId = $QuotationId }
    if ($SaleResult)  { $body.saleResult = $SaleResult }
    if ($Note)        { $body.note = $Note }
    return Invoke-Lts -Session $Session -Method POST -Path "/pricing-sheet" -Body $body
}

function Update-LtsPricingSheetResult {
    <#
    .SYNOPSIS
        PATCH /pricing-sheet/{id}/result — Cap nhat pricing sheet result (inputValue, saleResult).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter()] $InputValue,
        [Parameter()] $SaleResult
    )
    $body = @{}
    if ($InputValue) { $body.inputValue = $InputValue }
    if ($SaleResult) { $body.saleResult = $SaleResult }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/pricing-sheet/$Id/result" -Body $body
}

function Update-LtsPricingSheetAdvisorResult {
    <#
    .SYNOPSIS
        PATCH /pricing-sheet/{id}/advisor-result — Cap nhat masterResult (advisor result).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter(Mandatory = $true)] $Result
    )
    $body = @{ result = $Result }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/pricing-sheet/$Id/advisor-result" -Body $body
}

# ============================================================================
# QUOTATIONS: /quotations/*
# ============================================================================

function Get-LtsQuotations {
    <#
    .SYNOPSIS
        GET /quotations — List quotations cho managed customers.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/quotations"
}

function Get-LtsNonDraftQuotations {
    <#
    .SYNOPSIS
        GET /quotations/non-draft — List non-draft quotations for review.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/quotations/non-draft"
}

function New-LtsQuotation {
    <#
    .SYNOPSIS
        POST /quotations — Tao draft quotation.
    .PARAMETER PricingSheetIds
        Array pricing sheet id can attach (it nhat 1).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$CustomerCodeName,
        [Parameter(Mandatory = $true)] $InputValue,
        [Parameter(Mandatory = $true)] [string[]]$PricingSheetIds,
        [Parameter()] [string]$Description
    )
    $body = @{
        customerCodeName = $CustomerCodeName
        inputValue       = $InputValue
        pricingSheetIds  = @($PricingSheetIds)
    }
    if ($Description) { $body.description = $Description }
    return Invoke-Lts -Session $Session -Method POST -Path "/quotations" -Body $body
}

function Submit-LtsQuotation {
    <#
    .SYNOPSIS
        PATCH /quotations/{id}/status_update — Submit draft quotation (chuyen sang pending review).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id
    )
    return Invoke-Lts -Session $Session -Method PATCH -Path "/quotations/$Id/status_update"
}

function Review-LtsQuotation {
    <#
    .SYNOPSIS
        PATCH /quotations/{id}/review_update_status — Review quotation submitted.
    .PARAMETER Status
        "approved" hoac "rejected"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Id,
        [Parameter(Mandatory = $true)]
        [ValidateSet('approved', 'rejected')]
        [string]$Status
    )
    $body = @{ updateStatus = $Status }
    return Invoke-Lts -Session $Session -Method PATCH -Path "/quotations/$Id/review_update_status" -Body $body
}

# ============================================================================
# ACTIVITY LOGS: /activity-logs
# ============================================================================

function Get-LtsActivityLogs {
    <#
    .SYNOPSIS
        GET /activity-logs — List activity logs.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session
    )
    return Invoke-Lts -Session $Session -Method GET -Path "/activity-logs"
}

# ============================================================================
# Generic shortcuts
# ============================================================================

function Get-Lts {
    <#
    .SYNOPSIS
        Generic GET shortcut.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Path,
        [Parameter()] [hashtable]$Query
    )
    return Invoke-Lts -Session $Session -Method GET -Path $Path -Query $Query
}

function Post-Lts {
    <#
    .SYNOPSIS
        Generic POST shortcut.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $Session,
        [Parameter(Mandatory = $true)] [string]$Path,
        [Parameter()] $Body
    )
    return Invoke-Lts -Session $Session -Method POST -Path $Path -Body $Body
}
