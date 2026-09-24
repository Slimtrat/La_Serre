@id:bible-exchange @area:world @maturity:stable
@source:engine/world/bible_exchange.py @source:apps/api/bible_routes.py
@doc:docs/bible-exchange.md
Feature: Portable Bible exchange

  @python:tests/test_bible_exchange.py
  Scenario: Export and import portable canon
    Given a project contains canonical Bible entities
    When the Bible is exported and imported through the exchange schema
    Then canon survives the round trip without leaking local editorial history

  @python:tests/test_bible_exchange.py
  Scenario: Reject broken cross-references during import
    Given an exchange document refers to an unknown character
    When the document is validated
    Then the import is rejected before canon is changed
