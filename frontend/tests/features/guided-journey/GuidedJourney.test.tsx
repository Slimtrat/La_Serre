// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuidedJourney } from "../../../src/features/guided-journey";
import { renderWithStudio } from "../../../src/test";

const api = vi.hoisted(() => ({
  journey: vi.fn(),
  guided: vi.fn(),
  examples: vi.fn(),
  createProject: vi.fn(),
  listProjects: vi.fn(),
  activateProject: vi.fn(),
  saveBrief: vi.fn(),
  addCharacter: vi.fn(),
  saveCharacter: vi.fn(),
  promoteCharacter: vi.fn(),
  createEpisode: vi.fn(),
  linkEpisode: vi.fn(),
  propose: vi.fn(),
  accept: vi.fn(),
  reject: vi.fn(),
}));

vi.mock("@/generated/openapi", () => ({
  journeyApiStudioJourneyGet: api.journey,
  getGuidedApiGuidedGet: api.guided,
  getExamplesApiGuidedExamplesGet: api.examples,
  createProjectApiProjectsPost: api.createProject,
  listProjectsApiProjectsGet: api.listProjects,
  activateProjectApiProjectsProjectIdActivatePost: api.activateProject,
  putBriefApiGuidedBriefPut: api.saveBrief,
  createCharacterApiGuidedCharactersPost: api.addCharacter,
  putCharacterApiGuidedCharactersCharacterIdPut: api.saveCharacter,
  promoteCharacterApiGuidedCharactersCharacterIdPromotePost: api.promoteCharacter,
  createEpisodeApiEpisodesPost: api.createEpisode,
  putEpisodeLinkApiGuidedEpisodeLinkPut: api.linkEpisode,
  generateProposalApiGuidedProposalsPost: api.propose,
  acceptProposalApiGuidedProposalsProposalIdAcceptPost: api.accept,
  rejectProposalApiGuidedProposalsProposalIdRejectPost: api.reject,
}));

const action = {
  code: "EDIT",
  label: "Continuer",
  target: "#/produce",
  mode: "manual",
};
const stages = [
  "idea",
  "casting",
  "relationships",
  "season",
  "episode",
  "storyboard",
  "production",
  "release",
].map((id, index) => ({
  id,
  status: index === 0 ? "completed" : "empty",
  count: 0,
  blockers: [],
  primary_action: action,
}));
const guided = {
  state: {
    revision: 7,
    active_episode_id: null,
    brief: {
      working_title: "Tentafruit",
      idea: "Une serre romantique et dangereuse",
      genre: "Dark romance comique",
      tone: "Tendre et vénéneux",
      audience: "Vertical",
      episode_title: "La graine",
      episode_concept: "Un héritage vivant révèle un mensonge",
      locked_fields: ["tone"],
    },
    characters: [],
  },
  completion: {},
  canonical_characters: [],
  proposals: [],
};

beforeEach(() => {
  window.sessionStorage.removeItem("serre:guided-example-pending");
  api.journey.mockResolvedValue({
    project_id: "tentafruit",
    active_episode_id: null,
    revision: "r1",
    counts: {},
    stale_artifacts: [],
    stages,
  });
  api.guided.mockResolvedValue(guided);
  api.createProject.mockResolvedValue({ active_id: "example-123", projects: [] });
  api.listProjects.mockResolvedValue({ active_id: "example-123", projects: [] });
  api.activateProject.mockResolvedValue({ active_id: "example-123", projects: [] });
  api.examples.mockResolvedValue({ examples: [{
    id: "fritz-pizza",
    name: "Fritz et la fête des pizzas",
    description: "Une histoire pour apprendre l’allemand.",
    language: "de",
    learning_goals: ["Nommer les légumes en allemand"],
    continuity_notes: ["Fritz est un chat fermier"],
    brief: {
      working_title: "Fritz et la fête des pizzas",
      language: "de",
      idea: "Fritz aide deux ânes à préparer une fête.",
      genre: "Conte éducatif",
      tone: "Chaleureux",
      audience: "Enfants apprenant l’allemand",
      episode_title: "La fête",
      episode_concept: "Préparer ensemble un repas.",
    },
  }] });
  api.saveBrief.mockResolvedValue(guided);
  api.addCharacter.mockResolvedValue(guided);
  api.createEpisode.mockResolvedValue({ id: "S01E001" });
  api.linkEpisode.mockResolvedValue(guided);
  api.saveCharacter.mockResolvedValue(guided);
  api.promoteCharacter.mockResolvedValue(guided);
});
afterEach(() => {
  cleanup();
  window.sessionStorage.removeItem("serre:guided-example-pending");
});

describe("GuidedJourney", () => {
  it("resumes at the first incomplete snapshot stage", async () => {
    renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { name: "Qui porte l’histoire ?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Casting/ }).getAttribute("aria-current"),
    ).toBe("step");
  });

  it("renders the journey navigation and active stage in English", async () => {
    renderWithStudio(<GuidedJourney locale="en" onNavigate={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { name: "Who carries the story?" }),
    ).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Creation journey" })).toBeTruthy();
  });

  it("preserves locked fields and sends the optimistic revision", async () => {
    renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Idée/ }));
    const title = screen.getByRole("textbox", { name: /Titre de travail/ });
    fireEvent.change(title, { target: { value: "Tentafruit saison 1" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le brouillon" }),
    );
    await waitFor(() => expect(api.saveBrief).toHaveBeenCalled());
    expect(api.saveBrief.mock.calls[0]?.[0]).toMatchObject({
      expected_revision: 7,
      brief: {
        working_title: "Tentafruit saison 1",
        locked_fields: ["tone"],
      },
    });
  });

  it("creates an isolated example project only after confirmation and retries saving without duplicating it", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const emptyProject = {
      ...guided,
      state: {
        ...guided.state,
        revision: 0,
        active_episode_id: null,
        brief: { working_title: "", idea: "", genre: "", tone: "", audience: "", language: "fr", episode_title: "", episode_concept: "", locked_fields: [] },
        characters: [],
      },
      canonical_characters: [],
    };
    const savedProject = {
      ...emptyProject,
      state: {
        ...emptyProject.state,
        revision: 1,
        brief: {
          ...emptyProject.state.brief,
          working_title: "Fritz et la fête des pizzas",
          idea: "Fritz aide deux ânes à préparer une fête.",
          language: "de",
          source_example_id: "fritz-pizza",
          learning_goals: ["Nommer les légumes en allemand"],
          continuity_notes: ["Fritz est un chat fermier"],
        },
      },
    };
    let created = false;
    let saved = false;
    api.createProject.mockImplementation(async () => { created = true; return { active_id: "example-123", projects: [] }; });
    api.guided.mockImplementation(async () => saved ? savedProject : created ? emptyProject : guided);
    api.journey.mockImplementation(async () => ({
      project_id: created ? "example-123" : "tentafruit",
      active_episode_id: null,
      revision: created ? "r2" : "r1",
      counts: {},
      stale_artifacts: [],
      stages,
    }));
    api.saveBrief.mockRejectedValueOnce(new Error("Écriture interrompue")).mockImplementation(async () => {
      saved = true;
      return savedProject;
    });
    const view = renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Idée/ }));
    const title = screen.getByRole("textbox", { name: /Titre de travail/ }) as HTMLInputElement;
    fireEvent.change(await screen.findByRole("combobox", { name: "Histoire" }), { target: { value: "fritz-pizza" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer ce projet" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(title.value).toBe("Tentafruit");
    expect(api.createProject).not.toHaveBeenCalled();
    expect(api.saveBrief).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Créer ce projet" }));
    await waitFor(() => expect(api.createProject).toHaveBeenCalledWith({
      name: "Fritz et la fête des pizzas",
      template_id: "custom",
      clone_content: false,
      include_example_content: false,
    }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Écriture interrompue"));
    expect(api.createProject).toHaveBeenCalledTimes(1);
    expect(api.saveBrief).toHaveBeenCalledWith({
      expected_revision: 0,
      brief: expect.objectContaining({
        working_title: "Fritz et la fête des pizzas",
        language: "de",
        source_example_id: "fritz-pizza",
        learning_goals: ["Nommer les légumes en allemand"],
        continuity_notes: ["Fritz est un chat fermier"],
        locked_fields: [],
      }),
    });
    expect(window.sessionStorage.getItem("serre:guided-example-pending")).toContain("example-123");
    view.unmount();
    renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Idée/ }));
    fireEvent.click(screen.getByRole("button", { name: "Réessayer l’enregistrement" }));
    await waitFor(() => expect(api.saveBrief).toHaveBeenCalledTimes(2));
    expect(api.createProject).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Projet séparé créé avec ce brief/)).toBeTruthy();
    await waitFor(() => expect((screen.getByRole("textbox", { name: /Titre de travail/ }) as HTMLInputElement).value).toBe("Fritz et la fête des pizzas"));
    expect(window.sessionStorage.getItem("serre:guided-example-pending")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    await waitFor(() => expect(api.saveBrief).toHaveBeenCalledTimes(3));
    expect(api.saveBrief.mock.calls[2]?.[0]).toMatchObject({
      expected_revision: 1,
      brief: {
        source_example_id: "fritz-pizza",
        learning_goals: ["Nommer les légumes en allemand"],
        continuity_notes: ["Fritz est un chat fermier"],
      },
    });
  });

  it("explains an optimistic revision conflict", async () => {
    api.saveBrief.mockRejectedValueOnce(
      new Error("Le brouillon a changé. Recharge la vue."),
    );
    renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Idée/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le brouillon" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Le brouillon a changé",
    );
  });

  it("keeps a new character in draft until its completed sheet is explicitly promoted", async () => {
    const character = {
      id: "character_123",
      name: "Iris",
      role: "Gardienne",
      visual_description: "Une gardienne adulte aux cheveux argentés et au regard calme.",
      wardrobe: "Une longue veste anthracite brodée de motifs de pétales.",
      signature_details: ["cicatrice en étoile"],
      palette: ["argent", "anthracite", "violet"],
      personality: "Loyale, lucide et secrètement inquiète.",
      wants: ["protéger la serre"],
      fears: ["échouer seule"],
      voice_description: "Une voix basse, posée et légèrement voilée.",
      generation_negative_prompt: "identity drift",
      locked_fields: [],
      promoted_revision: null,
    };
    const withDraft = {
      ...guided,
      state: { ...guided.state, revision: 8, characters: [character] },
      completion: { characters: [{ id: character.id, ready: true, promoted: false, missing: [] }] },
    };
    api.guided.mockReset();
    api.guided.mockResolvedValueOnce(guided).mockResolvedValue(withDraft);
    api.addCharacter.mockResolvedValue(withDraft);
    api.promoteCharacter.mockResolvedValue({ ...withDraft, canonical_characters: [{ id: character.id, name: "Iris", role: "Gardienne" }] });

    renderWithStudio(<GuidedJourney locale="fr" onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter un personnage" }));
    expect(await screen.findByDisplayValue("Iris")).toBeTruthy();
    expect(screen.getByText(/brouillon/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Valider dans la Bible" }));
    await waitFor(() => expect(api.promoteCharacter).toHaveBeenCalledWith(
      character.id, { expected_revision: 8 },
    ));
  });
});
