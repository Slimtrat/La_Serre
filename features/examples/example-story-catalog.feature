@id:example-story-catalog @area:examples @maturity:stable
@source:engine/narrative/example_catalog.py @source:starter_catalog/story-examples/fritz-pizzafest-de.json
@doc:docs/tentafruit-format.md
Feature: Diverse starter story examples

  @python:tests/test_example_catalog.py
  Scenario: List and load packaged story examples
    Given the application ships with the starter story catalog
    When a creator chooses an example
    Then its source content and metadata are loaded from the packaged catalog

  @python:tests/test_example_catalog_packaging.py
  Scenario: Include examples in distributable builds
    Given a desktop distribution is assembled
    When packaged resources are inspected
    Then the example catalog remains available outside the source checkout
