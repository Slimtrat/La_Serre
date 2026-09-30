@id:asset-library @area:assets @maturity:stable
@source:apps/api/asset_catalog.py @source:apps/api/assets.py
@doc:docs/architecture.md
Feature: Unified reusable asset library

  @python:tests/test_asset_catalog.py
  Scenario: Query generated, imported, and canonical media together
    Given the project contains media from multiple origins
    When the asset catalog is searched or filtered
    Then matching records expose previews, provenance, and friendly facets

  @python:tests/test_asset_catalog.py
  Scenario: Reuse media without duplicating its blob
    Given an existing catalog asset is suitable for another binding
    When the creator reuses it
    Then the new binding references the same payload without duplicating storage
