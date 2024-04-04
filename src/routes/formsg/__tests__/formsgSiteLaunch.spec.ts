import { CaaRecord } from "node:dns"
import dnsPromises from "node:dns/promises"

import UsersService from "@root/services/identity/UsersService"
import InfraService from "@root/services/infra/InfraService"
import { DigDNSRecord } from "@root/services/utilServices/SendDNSRecordEmailClient"
import { SiteLaunchResult } from "@root/types/siteLaunch"

import { FormsgSiteLaunchRouter as _FormsgSiteLaunchRouter } from "../formsgSiteLaunch"

const MockUsersService = ({
  findById: jest.fn(),
  findByGitHubId: jest.fn(),
  findByEmail: jest.fn(),
} as any) as UsersService

const MockInfraService = ({
  getSite: jest.fn(),
} as any) as InfraService

const FormsgSiteLaunch = new _FormsgSiteLaunchRouter({
  usersService: MockUsersService,
  infraService: MockInfraService,
})

const mockResult: SiteLaunchResult = ({
  siteName: "testSite",
  primaryDomain: "test.com",
  primaryDomainSource: "test.com",
} as any) as SiteLaunchResult

const mockResultWithRedirection: SiteLaunchResult = ({
  siteName: "testSite",
  primaryDomain: "test.com",
  primaryDomainSource: "test.com",
  redirectionDomainSource: "test.com",
  redirectionDomainTarget: "www.test.com",
} as any) as SiteLaunchResult

describe("FormsgSiteLaunchRouter", () => {
  it("should add quad A records if any exists", async () => {
    // Arrange
    jest
      .spyOn(dnsPromises, "resolve6")
      .mockResolvedValue(["2404:6800:4003:c0f::64", "2404:6800:4003:c0f::8b"])
    const expectedResult = [
      {
        domain: "test.com",
        value: "2404:6800:4003:c0f::64",
        type: "AAAA",
      },
      {
        domain: "test.com",
        value: "2404:6800:4003:c0f::8b",
        type: "AAAA",
      },
    ] as DigDNSRecord[]

    // Act
    const actualResult = await FormsgSiteLaunch.digAAAADomainRecords(mockResult)

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should not add quad A records if none exists", async () => {
    // Arrange
    jest.spyOn(dnsPromises, "resolve6").mockResolvedValue([])
    const expectedResult = [] as DigDNSRecord[]

    // Act
    const actualResult = await FormsgSiteLaunch.digAAAADomainRecords(mockResult)

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should add AWS CAA records if required", async () => {
    // Arrange
    const caaResult: CaaRecord[] = [
      {
        critical: 0,
        issue: "cloudflaressl.com",
      },
    ]
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: true,
      addLetsEncryptCAA: false,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(mockResult)

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should not add AWS CAA if not required", async () => {
    // Arrange
    const caaResult: CaaRecord[] = []
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: false,
      addLetsEncryptCAA: false,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(mockResult)

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should not add AWS CAA if already present", async () => {
    // Arrange
    const caaResult: CaaRecord[] = [
      {
        critical: 0,
        issue: "amazon.com",
      },
    ]
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: false,
      addLetsEncryptCAA: false,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(mockResult)

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should add LetsEncrypt CAA records if required", async () => {
    // Arrange
    const caaResult: CaaRecord[] = [
      {
        critical: 0,
        issue: "amazon.com",
      },
    ]
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: false,
      addLetsEncryptCAA: true,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(
      mockResultWithRedirection
    )

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should not add LetsEncrypt CAA if not required", async () => {
    // Arrange
    const caaResult: CaaRecord[] = []
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: false,
      addLetsEncryptCAA: false,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(
      mockResultWithRedirection
    )

    // Assert
    expect(actualResult).toEqual(expectedResult)
  })

  it("should not add LetsEncrypt CAA if already present", async () => {
    // Arrange
    const caaResult: CaaRecord[] = [
      {
        critical: 0,
        issue: "letsencrypt.org",
      },
      {
        critical: 0,
        issue: "amazon.com",
      },
    ]
    jest.spyOn(dnsPromises, "resolveCaa").mockResolvedValue(caaResult)
    const expectedResult = {
      addAWSACMCertCAA: false,
      addLetsEncryptCAA: false,
    }

    // Act
    const actualResult = await FormsgSiteLaunch.digCAADomainRecords(
      mockResultWithRedirection
    )
    // Assert
    expect(actualResult).toEqual(expectedResult)
  })
})
